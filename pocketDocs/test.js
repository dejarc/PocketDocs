var socket = require('socket.io-client');
var connected_socket = null;
var index = 0;
var player_index = 0;
var all_players = [];
function init_socket_events() {
  connected_socket = socket('http://localhost:3000/');
  var timeout_alert = function() {
    console.log('the user has disconnected');//alert the player that they have disconnected
  };
  var timeout_function = setTimeout(timeout_alert,3000);//initialize alert
  var timeout_check = function () {//function to check continuously for socket connection
      console.log('a new timeout check was sent');
      connected_socket.emit('timeout_check');
  };
  timeout_check();//emit initial check
  connected_socket.on('timeout_check',function() {//clear the timeout
    clearTimeout(timeout_function);//clear previous timeout, wait and then emit new event
    timeout_function = setTimeout(timeout_alert,4000);
    setTimeout(timeout_check, 2500);//wait, then emit new timeout_check
  });
  all_players.push({player_name: 'mike',letters:''});
  all_players.push({player_name: 'rick',letters:''});
  all_players.push({player_name: 'lo',letters:''});
  all_players.push({player_name: 'rich',letters:''});
  connected_socket.on('new message',function(msg) {
    if(!msg.response) {
      return;
    }
    console.log(msg.response);
  });
  connected_socket.on('connection',function(msg) {
    console.log(msg);
    if(msg.created) {
      console.log('game created');
      clearTimeout(timeout_function);
    }
  });
  connected_socket.on('rotate_players',function(msg) {
    console.log(msg);
    var temp_index = 0;
    var user_key = null;
    var players = msg.players;
    console.log(msg.players);
    var num_players = 0;
    Object.keys(players).forEach(function(key) {
      console.log('temp index ' + temp_index + ' index' + index);
      if(temp_index === index) {
        user_key = key;
      }
      num_players++;
      temp_index++;
    })
    index++;
    if(index === num_players) {
      index = 0;
    }
    if(user_key) {
      var itemData = "it is now time for " + user_key + " to shoot";
      console.log(itemData);
    }
  });
  connected_socket.on('send_player',function() {
    var player = null;
    for(var i = 0; i <= player_index; i++) {
      console.log(all_players[i]);
      player = all_players[i];
    }
    player_index++;
    if(player_index === all_players.length) {
      player_index = 0;
    }
    connected_socket.emit('add_player',{next_player: player});
  });
  connected_socket.on('user_updated',function(msg) {
    console.log(msg.player + ' now has ' + msg.letters);
  });
  connected_socket.on('add_player',function(msg) {
    console.log('player  ' + msg.player_name + ' has been added ');
  });
  connected_socket.emit('init_game',{alexa_id: '1235', Alexa:true, game_id:'session.sessionId'});
}
init_socket_events();
