var socket = io();
var doc_id = null;
var all_images = null;
var user_avatar = null;
//socket.id = null;
socket.conversation_id = null;
socket.usr_name = null;
var start_edit = function (user) {//initialize the user in the conversation
  socket.conversation_id = user.project.project_id;
  if(!all_images) {//set all images if null
    all_images = user.project.all_images;//store the images on the client side
  }
  user_avatar = user.project.user_avatar;
  socket.emit('edit doc', user.project);//tell the user it is time to edit
};
socket.on('prompt user', function(msg){
    var name = null;
    if(msg.new_doc) {//user is the creator
      name = msg.author;
    } else {//otherwise, prompt for a name
      while(!name) {// make sure user has entered name
        if(msg.comment) {//user has entered an existing name,
          name = prompt(msg.comment);
        } else {
          name = prompt('welcome to the conversation. please enter a name for yourself ');
        }
      }
    }
    if(msg.title) {
      document.getElementById("page panel").innerHTML = msg.title;
    }
    socket.emit('add user',{user_name: name,user_image: user_avatar});//add the user to the document
});
socket.on('init doc',function() {
  socket.emit('get data');//grab the data
});
socket.on('data retrieved',function(msg) {
  var all_assets = msg;
  all_assets.all_images = all_images;
  all_assets.user_avatar = user_avatar;
  initAssets(all_assets);
});
socket.on('join', function(msg){
  if(socket.conversation_id && (msg.conversation_id === socket.conversation_id)) {//if user is in a conversation and the same conversation
      alert(msg.username + ' has joined.There are now ' + msg.num_users + ' in the conversation');
      socket.emit('get_user_loc',{name: msg.username});
  }
});
var update = function () {//check whether data has changed
  var lines = getLines();
  if(lines) {
    socket.emit('updated_data',lines);
  }
  var location = getUserLocation();
  socket.emit('updated_loc', location);
};
var remove = function() {
  socket.emit('delete user');
  socket.conversation_id = null;
};
function getSocketId() {
  return socket.conversation_id;
}
socket.on('player left',function(msg) {
  if(socket.conversation_id){
      if(socket.conversation_id === msg.id) {
        removePlayer(msg.name);
      }
  }
});
socket.on('add_user_asset',function(msg) {
  addAsset(msg);//add asset to existing user
});
socket.on('updated_data', function(msg){
  if(socket.conversation_id) {
    if(socket.conversation_id === msg.conversation_id) {//users are in the same convesation, update
      setData(msg.all_lines,msg.cur_line);
    }
  }
});
socket.on('updated_loc', function(msg){
  if(socket.conversation_id) {
    if(socket.conversation_id === msg.conversation_id) {//users are in the same convesation, update
      setLocation(msg);
    }
  }
});
