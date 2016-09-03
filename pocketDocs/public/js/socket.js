
  var socket = io();
  socket.usr_name = null;
  socket.on('connection', function(msg){
      var name = null;
      while(!name) {// make sure user has entered name
        name = prompt('welcome to the conversation. please enter a name for yourself ');
      }
      socket.emit('name',name);
      console.log('the name for the user is ' + name);
      if(!msg.title) {//if new doc prompt for a title
        var title = prompt("please enter a title for your document");
        document.getElementById("page header").innerHTML = title;
        console.log('the title is ' + title);
        socket.emit('init_document', title);
        console.log('init assests');
        initAssets({myName:name});//new conversation, initialize userName
      } else {//else get the data
        socket.emit('get data');
        document.getElementById("page header").innerHTML = msg.title;
      }
  });
  socket.on('get data',function(msg) {
    initAssets(msg);
  });
  socket.on('join', function(msg){
    alert('there are now ' + msg.num_users + ' in the conversation');
    socket.emit('new_user_loc',msg.usr_data.name);
  });

  window.onload = function() {
      console.log('page was loaded successfully');
      window.addEventListener('keydown',function (event) {
        var lines = getLines();
        if(lines) {
          socket.emit('updated_data',lines);
          var location = getUserLocation();
          //console.log(location);
          socket.emit('updated_loc', location);
        }
    }, false);
  }
  socket.on('new_user_loc',function(msg) {
    //console.log(msg.name + ' is now at the location ' + msg.data);
    addAsset(msg);//add asset to existing user
    //addAsset(msg.usr_data); to initialize the correct user location

  });
  socket.on('updated_data', function(msg){
    setData(msg.all_lines,msg.cur_line);
  });
  socket.on('updated_loc', function(msg){
    setLocation(msg);
  });
