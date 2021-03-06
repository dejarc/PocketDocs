var fs = require('fs');
var express = require('express');
var path = require("path");
var bodyParser = require("body-parser");
var app = express();
var http = require('http').Server(app);
var io = require('socket.io');
var socket = io(http);
var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;
var connected = false;
var all_conv = {};//to hold a reference to all conversation namespaces
var port = process.env.PORT || 3000;
var db;
var uri = 'mongodb://127.0.0.1/test';
var CONVERSATIONS = 'Conversations';
var USERS = 'Users';
var BASE_URL = "http://localhost:3000/";//hold a static reference to the base url
var image_dir = __dirname + '/public/images';
var image_arr = [];//to hold all the images for users
var files = fs.readdirSync(image_dir);//read all the files in image directory before proceeding
files.forEach(function(file) {
  var image_url = '/images/' + file;//create url for image relative to the game panel
  image_arr.push(image_url);
});
mongodb.MongoClient.connect(uri ,function(error,database) {
  if(error) {
    console.log(error);
    process.exit();
  } else {
    db = database;
    http.listen(port, function(){
      console.log('listening on *:3000');
    });
  }
});
function initNameSpace(conv_id,callback) {//initialize the unique namespace
  var spc_name = "/" + conv_id;
  var nsp = socket.of(spc_name);
  all_conv[conv_id] = nsp;//hold a reference to this namespace
  nsp.total_users = 0;
  nsp.spc_name = conv_id;
  nsp.on('connection', function(client){
    console.log('someone connected to namespace ' + conv_id);
    nsp.total_users += 1;
    console.log("the total users in this namespace are " + this.total_users);
    client.on('edit doc',function(msg) {
      client.conversation_id = msg.project_id;
      client.emit('prompt user',msg);
    });
    client.on('add user',function(msg) {//insert the user into the current document
      if(msg.user_name) {//verify user has set name in the conversation
        db.collection(CONVERSATIONS).update({_id: new ObjectID(client.conversation_id),
        "player_data.name": {$nin:[msg.user_name]}},//verify that the name is not already in the conversation
        {$push : {player_data: {name: msg.user_name,avatar: msg.user_image, data: {x: 1, y: 1}}}}, function(err,res) {
          if(err) {
            console.log(err);
          } else {
            if(res.result.nModified > 0) {//user entered a unique name, proceed
              client.name = msg.user_name;
              client.emit('init doc');//once user has been added, initialize document
            } else {//ask user for name again
              client.emit('prompt user',{comment: "there is already a user named " + msg.user_name + " in the conversation. please enter a unique name"});
            }
          }
        });
      }
    });
    client.on('get data',function() {
        db.collection(CONVERSATIONS).find({_id: new ObjectID(client.conversation_id)},
        {conversation: true, player_data: true, project: true }).toArray(function(err,res) {
          if(err) {
            console.log(err);
          } else {
            var temp = res[0];
            client.emit('data retrieved',{all_lines:temp.conversation.all_lines,
              cur_line:temp.conversation.this_line,
              player_data:temp.player_data,
              myName:client.name,
              project:temp.project,
              conv_exists:true//consider taking this out
            });//send data once retrieved
            client.broadcast.emit('join', {num_users:temp.player_data.length, conversation_id:client.conversation_id, username:client.name});//send information to other users
          }
        });
    });
    client.on('timeout_check',function(msg) {//notify the client that user they are still connected
      client.emit('timeout_check',msg);
    });
    client.on('disconnect', function(){
      removeUser();
      console.log('user disconnected');
    });
    client.on('delete user',function() {
      removeUser();
    });
    function removeUser() {
      nsp.total_users -= 1;
      var delete_msg = "consider deleting conversation " + nsp.spc_name;
      var usr_msg = "there are now " + nsp.total_users + " in conversation " + nsp.spc_name;
      var response = (nsp.total_users > 0) ? usr_msg : delete_msg;
      console.log(response);
      if(client.conversation_id && client.name) {//the user has been initialized in the conversation,remove
        db.collection(CONVERSATIONS).update({_id: new ObjectID(client.conversation_id)},
        {$pull : {player_data: {name: client.name}}}, function(err,res) {
          if(err) {
            console.log(err);
          } else {
            client.broadcast.emit('player left',{name: client.name, id:client.conversation_id});//remove user from conversation
            client.conversation_id = null;
          }
        });
      }
    }
    client.on('get_user_loc', function(msg) {//find current location of the user
        db.collection(CONVERSATIONS).find({"_id": new ObjectID(client.conversation_id),"player_data.name":msg.name},
        {"player_data":true,"_id":false},
        {"player_data.$":1}).toArray(function(err,res) {
          if(err) {
            console.log(err);
          } else {
            if(res[0]) {//user disconnected before user location was acquired
              var arr = res[0].player_data;
              var user_data = null;
              for(var i = 0; i < arr.length; i++) {
                if(arr[i].name === msg.name) {
                  user_data = arr[i];
                  break;
                }
              }
              if(user_data) {
                client.emit('add_user_asset',user_data);
              }
            }
          }
        });
    });
    client.on('updated_data', function(msg){
      if(client.conversation_id) {
        db.collection(CONVERSATIONS).update({_id: new ObjectID(client.conversation_id)},
        {$set: {"conversation.all_lines": msg.all_lines, "conversation.this_line":msg.cur_line}}, function(err,res) {
          if(err) {
            console.log(err);
          } else {
            var updated_data = msg;
            updated_data.conversation_id = client.conversation_id;
            client.broadcast.emit('updated_data',updated_data);
          }
        });
      } else {
        console.log('could not find the conversation with the id');
      }
    });
    client.on('updated_loc', function(msg) {//save the location of the user
      if(client.conversation_id) {
        db.collection(CONVERSATIONS).update({_id: new ObjectID(client.conversation_id), "player_data.name": client.name},
        {"$set": {"player_data.$.data": msg}}, function(err,res) {
          if(err) {
            console.log(err);
          } else {
            var updated_location = {name: client.name, location: msg};
            updated_location.conversation_id = client.conversation_id;
            client.broadcast.emit('updated_loc',updated_location);
          }
        });
      } else {
        console.log('could not find by id');
      }
    });
  });
  callback("The new namespace " + conv_id + " has been created with 1 user.");
}
//app.use(express.static(__dirname + '/login.js'));
app.use(express.static(__dirname + '/public'));
app.use('/nm', express.static(__dirname + '/node_modules'));
app.use('/css', express.static(__dirname + '/public/templates/css'));
app.use(bodyParser.json());
app.get('/', function(req, res){
  res.sendFile(__dirname + '/public/index.html');
});
function handleError(res, reason, message, code) {
  console.log("ERROR: " + reason);
  res.status(code || 500).json({"error": message});
}
app.get('/openConv',function(req,res) {
  db.collection(CONVERSATIONS).find({},{title:true, author:true,player_data:true}).toArray(function(err,docs) {
      if(err) {
        handleError(res,err.message,"failed to get contacts");
      } else {
        res.status(200).json(docs);
      }
  });
});
app.get('/verifyUser',function(req,res) {
  if(!req.query.email || (!req.query.password && !req.query.username)) {//user must enter in both email and password or username
    handleError(res, "Invalid Input","Must provide email and username or password");
  } else {
    var queryObj = null;
    if(req.query.password) {
      queryObj = {email: req.query.email, password: req.query.password};
    } else {
      queryObj = {email: req.query.email, username: req.query.username};
    }
    db.collection(USERS).findOne(queryObj,function(err,doc) {
        if(err) {
          handleError(res,err.message,"failed to verify user");
        } else {
          res.status(200).json(doc);
        }
    });
  }
});
app.get('/openConv/:id',function(req,res) {
  db.collection(CONVERSATIONS).findOne({_id: new ObjectID(req.params.id)},function(err,doc) {
      if(err) {
        handleError(res,err.message,"failed to get contacts");
      } else {
        res.status(200).json(doc);
      }
  });
});
app.get('/userConv/:id',function(req,res) {
  db.collection(CONVERSATIONS).find({author_id: req.params.id}).toArray(function(err,docs) {
      if(err) {
        handleError(res,err.message,"failed to get conversations for user");
      } else {
        res.status(200).json(docs);
      }
  });
});
app.put('/openConv/:id', function(req,res) {
  db.collection(CONVERSATIONS).update({_id: new ObjectID(req.params.id)},
  {"$set": {"project":req.body}}, function(err,res) {
    if(err) {
      console.log(err);
    } else {
      console.log('data inserted');
    }
  });
});
app.post('/openConv',function(req,res) {
  var newConversation = req.body;
  var conversation = {};
  conversation.all_lines = [];
  conversation.this_line = "";
  newConversation.conversation = conversation;
  newConversation.player_data = [];
  if(!(req.body.title && req.body.author)) {
    handleError(res, "Invalid Input","Must provide both a title and author");
  } else {
    db.collection(CONVERSATIONS).insertOne(newConversation, function(err, doc){
        if(err) {
          handleError(res,err.message,'failed to create conversation');
        } else {
          res.status(201).json(doc.ops[0]);
        }
    });
  }
});
app.post('/createUser',function(req,res) {
  var newUser = req.body;
  if(!(req.body.email && req.body.username && req.body.password)) {
    handleError(res, "Invalid Input","Must provide email, username, and password");
  } else {
    db.collection(USERS).insertOne(newUser, function(err, doc){
        if(err) {
          handleError(res,err.message,'failed to create conversation');
        } else {
          res.status(201).json(doc.ops[0]);
        }
    });
  }
});
app.get('/testing',function(req,res) {
  res.write('hello world');
});
app.get('/avatarImages',function(req,res) {
  res.status(201).json(image_arr);
});
app.post('/nspCreate',function(req,res) {
  var conv_id = req.body.conv_id;
  if(!conv_id) {
    handleError(res, "no conversation was sent", "please select a valid conversation");
  } else {
    var spc_msg = "requested namespace " + req.body.conv_id + "is active ";
    var send_res = function(msg) {
      console.log(msg);
      var num_keys = 0;
      var nsp_msg = "The current namespaces are: ";
      Object.keys(all_conv).forEach(function(key) {
        num_keys++;
        nsp_msg += key + " ";
      })
      if(num_keys === 0) {
        nsp_msg += "none";
      }
      console.log(nsp_msg);//monitor the current conversations
      res.status(201).json({"active_socket": true});
    };
    //if namespace socket has not been created,must create now
    all_conv[conv_id] ? send_res(spc_msg + ("with " + all_conv[conv_id].total_users + " users")) : initNameSpace(conv_id,send_res);
  }
});
