var socket = null;//io('http://localhost:3000/');
var all_images = null;
var user_avatar = null;
var timeout_cont = null;//hold a reference the the loop timeout
var modal_obj = null;
var timeout_function = null;
var timeout_check = function (rep_val) {//to check continuously for socket connection
    socket.emit('timeout_check',{repeat_check: rep_val});
};
function clear_time_loop() {
  if(timeout_cont) {//immediately clear both timeouts
    clearTimeout(timeout_cont);
  }
}
var timeout_msg = function() {
  alert('you were disconnected');//alert the player that they have disconnected
};
var start_edit = function (project) {//initialize the user in the conversation
  var spc_name = "/" + project.project_id;//set a special name space for the conversation
  console.log("connecting to namespace " + spc_name);
  socket = io(spc_name);//initialize the socket to the current conversation
  timeout_function = setTimeout(timeout_msg,3000);//initialize alert
  if(!all_images) {//set all images if null
    all_images = project.all_images;//store the images on the client side
  }
  user_avatar = project.user_avatar;
  socket.on('timeout_check',function(msg) {
    clearTimeout(timeout_function);//clear previous timeout
    if(msg.repeat_check) {//continue cycle
      timeout_function = setTimeout(timeout_msg,6000);
      timeout_cont = setTimeout(function() {
        timeout_check(true);
      }, 3500);//wait, then emit new timeout_check
    } else {//clear continuous
      clear_time_loop();
    }
  });

  timeout_check(false);//emit initial check
  socket.on('prompt user', function(msg){
      var name = null;
      if(msg.title) {
        document.getElementById("page panel").innerHTML = msg.title;
      }
      if(msg.new_doc) {//user is the creator, add to document, otherwise display modal
        name = msg.author;
        socket.emit('add user',{user_name: name,user_image: user_avatar});//add the user to the document
      } else {//trigger modal function
        if(modal_obj) {
          if(msg.comment) {//if value entered was existing username
            modal_obj.find('#alert').html(msg.comment);
          } else {
            modal_obj.find('#label').html("name:");
            modal_obj.find('#body_title').html("Enter your name in the conversation");
            modal_obj.find('#header_title').html("Enter Name");
            modal_obj.find('#submit').html("Submit");
            modal_obj.modal({closeExisting: false});
          }
        }
      }
  });
  socket.on('init doc',function() {
    if(modal_obj) {
      modal_obj.validated = true;
      modal_obj.modal('hide');
    }
    socket.emit('get data');//grab the data
  });
  socket.on('data retrieved',function(msg) {
    var all_assets = msg;
    all_assets.all_images = all_images;
    all_assets.user_avatar = user_avatar;
    initAssets(all_assets);
    socket.game_active = true;//flag indicating users assets have been initialized to the current conversation
  });
  socket.on('join', function(msg){
    if(modal_obj.validated) {//if user has entered their name, open new modal
      modal_obj.find('#name').hide();
      modal_obj.find('#label').html("new user:");
      modal_obj.find('#header_title').html("New User Joined");
      modal_obj.find('#body_title').html(msg.username + " has joined your conversation.There are now " + msg.num_users + " in the conversation.");
      modal_obj.find('#submit').html("Okay");
      modal_obj.join_alert = true;
      modal_obj.modal({closeExisting: true});
      socket.emit('get_user_loc',{name: msg.username});
    } else {//if user has not been validated, append to modal alert
      modal_obj.find('#alert').html(msg.username + " has joined your conversation.There are now " + msg.num_users + " in the conversation.");
    }
  });

  socket.on('player left',function(msg) {
    removePlayer(msg.name);
  });
  socket.on('add_user_asset',function(msg) {
    addAsset(msg);//add asset to existing user
  });
  socket.on('updated_data', function(msg){
    setData(msg.all_lines,msg.cur_line);
  });
  socket.on('updated_loc', function(msg){
    setLocation(msg);
  });
  socket.emit('edit doc', project);//tell the user it is time to edit
  timeout_check(true);//user is now in active conversation, check for active connection
};
var update = function () {//check whether data has changed
  if(!socket || !socket.game_active) {//assets have not been initialized, disregard update
    return;
  }
  var lines = getLines();
  if(lines) {
    socket.emit('updated_data',lines);
  }
  var location = getUserLocation();
  if(location) {
    socket.emit('updated_loc', location);
  }
};
var remove = function() {
  if(!socket) {
    return;
  }
  clear_time_loop();
  clearTimeout(timeout_function);
  timeout_check(false);
  socket.disconnect();
  socket = null;
};
function set_timeout_msg(new_msg) {
  timeout_msg = new_msg;
}
function set_user_modal(modal_trigger) {
  modal_obj = modal_trigger;
  modal_obj.on('hide.bs.modal', function(e){
    if(modal_obj.validated || modal_obj.join_alert) {
      return;
    }
    var new_name = $('#name').val();
    e.preventDefault();
    e.stopImmediatePropagation();
    if(new_name) {
      socket.emit('add user',{user_name: new_name,user_image: user_avatar});
    } else {
      modal_obj.find('#alert').html('please enter a valid name');
    }
     return false;
  });
}
