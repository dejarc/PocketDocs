var socket = io();
var doc_id = null;
var all_images = null;
var user_avatar = null;
var timeout_cont = null;//hold a reference the the loop timeout
var name_modal = null;
socket.conversation_id = null;
socket.usr_name = null;
var timeout_msg = function() {
  alert('you were disconnected');//alert the player that they have disconnected
};
var timeout_function = setTimeout(timeout_msg,3000);//initialize alert
var timeout_check = function (rep_val) {//to check continuously for socket connection
    console.log('a new timeout check was sent with repeat ' + rep_val);
    socket.emit('timeout_check',{repeat_check: rep_val});
};
function clear_time_loop() {
  if(timeout_cont) {//immediately clear both timeouts
    console.log('clearing looping timeout');
    clearTimeout(timeout_cont);
  }
}
var start_edit = function (user) {//initialize the user in the conversation
  socket.conversation_id = user.project.project_id;
  if(!all_images) {//set all images if null
    all_images = user.project.all_images;//store the images on the client side
  }
  user_avatar = user.project.user_avatar;
  socket.emit('edit doc', user.project);//tell the user it is time to edit
  timeout_check(true);//user is now in active conversation, check for active connection
};
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
  clear_time_loop();
  clearTimeout(timeout_function);
  timeout_check(false);
  socket.conversation_id = null;
};
function getSocketId() {
  return socket.conversation_id;
}
function set_timeout_msg(new_msg) {
  console.log('timeout message reset');
  timeout_msg = new_msg;
}
function set_user_modal(modal_trigger) {
  name_modal = modal_trigger;
  name_modal.on('hide.bs.modal', function(e){
    var user_name = $('#name').val();
    if(!user_name) {
       e.preventDefault();
       e.stopImmediatePropagation();
       console.log('no name was entered for the user');
       return false;
     } else {
       console.log('the name chosen for the user was ' + user_name);
       send_username(user_name);
     }
  });
}
function send_username(my_name) {
  socket.emit('add user',{user_name: my_name,user_image: user_avatar});
}
socket.on('timeout_check',function(msg) {
  clearTimeout(timeout_function);//clear previous timeout
  console.log('timeout cleared ');
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
      if(name_modal) {
        if(msg.comment) {
          clearTimeout(timeout_function);
          alert(msg.comment);
          name_modal.modal({closeExisting: true});
        } else {
          name_modal.modal({closeExisting: true});
        }
      }
      /*while(!name) {// make sure user has entered name
        if(msg.comment) {//user has entered an existing name,
          name = prompt(msg.comment);
        } else {
          name = prompt('welcome to the conversation. please enter a name for yourself ');
        }
      }*/
    }
    //socket.emit('add user',{user_name: name,user_image: user_avatar});//add the user to the document
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
      console.log('begin alert');
      clearTimeout(timeout_function);
      alert(msg.username + ' has joined.There are now ' + msg.num_users + ' in the conversation');
      console.log('alert done');
      socket.emit('get_user_loc',{name: msg.username});
  }
});

socket.on('player left',function(msg) {
  if(socket.conversation_id && (socket.conversation_id === msg.id)) {
    removePlayer(msg.name);
  }
});
socket.on('add_user_asset',function(msg) {
  addAsset(msg);//add asset to existing user
});
socket.on('updated_data', function(msg){
  if(socket.conversation_id && (socket.conversation_id === msg.conversation_id)) {
      setData(msg.all_lines,msg.cur_line);
  }
});
socket.on('updated_loc', function(msg){
  if(socket.conversation_id &&( socket.conversation_id === msg.conversation_id)) {//users are in the same convesation, update
      setLocation(msg);
  }
});
