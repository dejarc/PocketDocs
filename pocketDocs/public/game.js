// This game shell was happily copied from Googler Seth Ladd's "Bad Aliens" game and his Google IO talk in 2011
var allLines = [];
var line = '';
var user_loc = null;
var GAME_ENGINE = null;
var ASSET_MANAGER = null;

window.requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function (/* function */ callback, /* DOMElement */ element) {
                window.setTimeout(callback, 1000 / 60);
            };
})();

function AssetManager() {
    this.successCount = 0;
    this.errorCount = 0;
    this.cache = [];
    this.downloadQueue = [];
}

AssetManager.prototype.queueDownload = function (path) {
    console.log(path.toString());
    this.downloadQueue.push(path);
}

AssetManager.prototype.isDone = function () {
    return (this.downloadQueue.length == this.successCount + this.errorCount);
}
AssetManager.prototype.downloadAll = function (callback) {
    if (this.downloadQueue.length === 0) window.setTimeout(callback, 100);
    for (var i = 0; i < this.downloadQueue.length; i++) {
        var path = this.downloadQueue[i];
        var img = new Image();
        var that = this;
        img.addEventListener("load", function () {
            console.log("dun: " + this.src.toString());
            that.successCount += 1;
            if (that.isDone()) { callback(); }
        });
        img.addEventListener("error", function () {
            that.errorCount += 1;
            if (that.isDone()) { callback(); }
        });
        img.src = path;
        this.cache[path] = img;
    }
}

AssetManager.prototype.getAsset = function(path){
    //console.log(path.toString());
    return this.cache[path];
}


function GameEngine() {
    this.entities = [];
    this.allLines= [];
    this.line = '';
    this.ctx = null;
    this.click = null;
    this.mouse = null;
    this.wheel = null;
    this.surfaceWidth = null;
    this.surfaceHeight = null;
}

GameEngine.prototype.init = function (ctx) {
    this.ctx = ctx;
    this.surfaceWidth = this.ctx.canvas.width;
    this.surfaceHeight = this.ctx.canvas.height;
    this.startInput();

    console.log('game initialized');
}

GameEngine.prototype.start = function () {
    console.log("starting game");
    var that = this;
    (function gameLoop() {
        that.loop();
        requestAnimFrame(gameLoop, that.ctx.canvas);
    })();
}
function setData(myData, myLine) {
  GAME_ENGINE.allLines = myData;
  GAME_ENGINE.line = myLine;
}
function removePlayer(player_name) {
  if(GAME_ENGINE) {
    var temp = GAME_ENGINE.entities;
    for(var index = temp.length - 1; index > 0; index--) {
      if(temp[index].name) {
        if(temp[index].name === player_name) {//remove the player from the array
          var player = temp.splice(index,1);
          console.log('removing player ' + player.name + ' from the conversation');
        }
      }
    }
  }
}
function setLocation(myLocation) {
  var user_info = myLocation.location;
  if(myLocation.name === GAME_ENGINE.name) {
    user_loc = myLocation.location;
  }
  if(GAME_ENGINE) {
    var temp = GAME_ENGINE.entities;
    for(var i = 0; i < temp.length; i++) {
      if(temp[i].name) {
        if(temp[i].name === myLocation.name) {
          temp[i].x = user_info.x;
          temp[i].y = user_info.y;
        }
      }
    }
  }
}
function getUserLocation() {
  return user_loc;
}
function getLines() {
  if(GAME_ENGINE) {
    return {all_lines: GAME_ENGINE.allLines, cur_line: GAME_ENGINE.line};
  }
  return null;
}
function updateData(game_engine,newData,user_y,user_x) {
  if(user_y < game_engine.allLines.length) {
    if(newData) {
      if(user_x > 0) {
        game_engine.allLines[user_y] = game_engine.allLines[user_y].substring(0,user_x + 1) + newData +
        game_engine.allLines[user_y].substring(user_x + 1, game_engine.allLines[user_y].length);
      } else {
        game_engine.allLines[user_y] = newData + game_engine.allLines[user_y];
      }
    } else {
      game_engine.allLines[user_y] = game_engine.allLines[user_y].substring(0,user_x) +
      game_engine.allLines[user_y].substring(user_x + 1, game_engine.allLines[user_y].length);
    }
  } else {
    if(newData) {
      if(user_x > 0) {
        game_engine.line = game_engine.line.substring(0,user_x + 1) + newData +
        game_engine.line.substring(user_x + 1, game_engine.line.length);
      }  else {
        game_engine.line = newData + game_engine.line;
      }
    } else {
      game_engine.line = game_engine.line.substring(0,user_x) + game_engine.line.substring(user_x + 1, game_engine.line.length);
    }
  }
}
GameEngine.prototype.startInput = function () {
    console.log('Starting input');

    var getXandY = function (e) {
        var x = e.clientX - that.ctx.canvas.getBoundingClientRect().left;
        var y = e.clientY - that.ctx.canvas.getBoundingClientRect().top;

        if (x < 1024) {
            x = Math.floor(x / 32);
            y = Math.floor(y / 32);
        }

        return { x: x, y: y };
    }
    var shift = false;
    var shift_offset = 32;
    var user_x = 0;//store location of user relative to word
    var user_y = 0;
    var that = this;
    this.ctx.canvas.addEventListener("click", function (e) {
        //console.log('canvas was clicked at x ' + e.clientX + "and y " + e.clientY);
	that.click = getXandY(e);
    }, false);

    this.ctx.canvas.addEventListener("mousemove", function (e) {
        e.preventDefault();
        that.mouse = getXandY(e);
    }, false);

    this.ctx.canvas.addEventListener("mousewheel", function (e) {
        e.preventDefault();
        that.wheel = e;
    }, false);

    this.ctx.canvas.addEventListener("keydown", function (e) {
        e.preventDefault();
        var temp_loc = getUserLocation();
        var x = null;//store pixel location for the user
        var y = null;
        if(temp_loc) {
          x = temp_loc.x;
          y = temp_loc.y;
        } else {
          x = 0;
          y = 0;
        }
        if(e.keyCode === 16) {
          shift = true;
          shift_offset = 0;
        }
        if(e.keyCode > 64 && e.keyCode < 91) {
          updateData(that,String.fromCharCode(e.keyCode + shift_offset),user_y,user_x);
          user_x++;
        } else if(e.keyCode === 32){
          updateData(that,String.fromCharCode(e.keyCode),user_y,user_x);
          user_x += 1;
        } else if(e.keyCode === 13) {
          that.allLines.push(that.line);
          that.line = '';
          user_x = 0;
          user_y++;
        } else if(e.keyCode === 190) {
          console.log('period code ' + e.keyCode);
          var symbol = '.';
          if(shift) {
            symbol = '>'
          }
          updateData(that,symbol,user_y,user_x);
          user_x++;
        } else if(e.keyCode === 191) {
          console.log('slash code ' + e.keyCode);
          var symbol = '/';
          if(shift) {
            symbol = '?';
          }
          updateData(that,symbol,user_y,user_x);
          user_x++;
        } else if(e.keyCode === 188) {
          console.log('comma code ' + e.keyCode);
          var symbol = ',';
          if(shift) {
            symbol = '<';
          }
          updateData(that,symbol,user_y,user_x);
          user_x += 1;
        } else if(e.keyCode === 8) {
          console.log('backspace code ' + e.keyCode);
          //console.log('backspace was encountered');
          updateData(that,null,user_y,user_x);
          if(user_x > 0 ) {
            user_x--;
          } else if(user_y > 0) {
            user_y--;
            user_x = that.allLines[user_y].length;
          }
        } else if(e.keyCode === 222) {
          console.log('Quote code ' + e.keyCode);

          var symbol = "'";
          if(shift) {
            symbol = '"';
          }
          updateData(that,symbol,user_y,user_x);
          user_x++;
        } else if(e.keyCode > 36 && e.keyCode < 41) {
          console.log('the arrow key was ' + e.keyCode);
          if(e.keyCode === 37) {
            if(x && x >= 0) {
              if(user_x > 0) {
                user_x--;
              } else if(user_y > 0){
                user_y--;
                user_x = that.allLines[user_y].length;
              }
            }
          } else if(e.keyCode === 38) {
            if(user_y > 0) {
              user_y--;
            }
          } else if(e.keyCode === 39) {//right arrow
            if(x && x >= 0) {
              if(user_x < that.allLines[user_y].length) {
                user_x++;
              } else if(user_y < that.allLines.length) {
                user_y++;
                user_x = 0;
              }
            }
          } else if(e.keyCode === 40) {
            if(user_y < that.allLines.length) {
              user_y++;
            }
          }
        }
        if(user_y < that.allLines.length && that.allLines.length > 0) {
          x = that.ctx.measureText(that.allLines[user_y].substring(0, user_x)).width;//set new width to one less
        } else {
          x = that.ctx.measureText(that.line.substring(0, user_x)).width;//set new width to one less
        }
        y = user_y + 1;
        if(x < 8) {
          x = 1;
        }
        setData(that.allLines,that.line);
        if(x && y) {
          setLocation({name:GAME_ENGINE.name, location:{x:(x ), y:(y)}});
        } else {
          setLocation({name:GAME_ENGINE.name, location:{x:that.ctx.measureText(that.line).width, y:(that.allLines.length + 1)}});
        }
    }, false);
    this.ctx.canvas.addEventListener("keyup", function (e) {
      e.preventDefault();
      if(e.keyCode === 16) {
        shift = false;
        shift_offset = 32;
      }
    }, false);

    console.log('Input started');
}

GameEngine.prototype.addEntity = function (entity) {
    console.log('added entity');
    this.entities.push(entity);
}

GameEngine.prototype.draw = function (drawCallback) {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.save();
    var temp = '';
    var lines = 1;
    var new_data = getLines();
    this.allLines = new_data.all_lines;
    this.line = new_data.cur_line;
    for(var i = 0; i < this.allLines.length; i++) {
        this.ctx.fillText(this.allLines[i],10, 20 * lines);
        lines++;
    }
    this.ctx.fillText(this.line,10, 20 * lines);
    for (var i = 0; i < this.entities.length; i++) {
        var temp_ent = this.entities[i];
        this.entities[i].draw(this.ctx,temp_ent.x - 5, temp_ent.y);
    }
    if (drawCallback) {
        drawCallback(this);
    }
    this.ctx.restore();
}

GameEngine.prototype.update = function () {
    var entitiesCount = this.entities.length;
    for (var i = 0; i < entitiesCount; i++) {
        var entity = this.entities[i];
        if (!entity.removeFromWorld) {
            entity.update();
        }
    }

    for (var i = this.entities.length - 1; i >= 0; --i) {
        if (this.entities[i].removeFromWorld) {
            this.entities.splice(i, 1);
        }
    }
}

GameEngine.prototype.loop = function () {
    this.update();
    this.draw();
    this.click = null;
    this.wheel = null;
}

function Entity(game, x, y) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.removeFromWorld = false;
}

Entity.prototype.update = function () {

}

Entity.prototype.draw = function (ctx) {
    if (this.game.showOutlines && this.radius) {
        ctx.beginPath();
        ctx.strokeStyle = "green";
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        ctx.stroke();
        ctx.closePath();
    }
}

Entity.prototype.rotateAndCache = function (image, angle) {
    var offscreenCanvas = document.createElement('canvas');
    var size = Math.max(image.width, image.height);
    offscreenCanvas.width = size;
    offscreenCanvas.height = size;
    var offscreenCtx = offscreenCanvas.getContext('2d');
    offscreenCtx.save();
    offscreenCtx.translate(size / 2, size / 2);
    offscreenCtx.rotate(angle);
    offscreenCtx.translate(0, 0);
    offscreenCtx.drawImage(image, -(image.width / 2), -(image.height / 2));
    offscreenCtx.restore();
    //offscreenCtx.strokeStyle = "red";
    //offscreenCtx.strokeRect(0,0,size,size);
    return offscreenCanvas;
}

// GameBoard code below

function GameBoard() {

    Entity.call(this, null, 0, 0);
}

GameBoard.prototype = new Entity();
GameBoard.prototype.constructor = GameBoard;

GameBoard.prototype.update = function () {
    Entity.prototype.update.call(this);
}

GameBoard.prototype.draw = function (ctx,chars) {

}
function UserSprite(myImage,x,y,name) {
  this.img = myImage;
  this.name = name;
  Entity.call(this, null, x, y);
}
UserSprite.prototype = new Entity();
UserSprite.prototype.constructor = UserSprite;
UserSprite.prototype.update = function () {
    Entity.prototype.update.call(this);
}
UserSprite.prototype.draw = function (ctx,width, lines) {
  var xOffset = 20;
  ctx.drawImage(this.img, width + xOffset, (20 * (lines - 1) + 17));
}
function addAsset(new_usr) {
  var address = new_usr.avatar;
  var sprite = ASSET_MANAGER.getAsset(address);
  var nxt_user = new UserSprite(sprite,new_usr.data.x,new_usr.data.y,new_usr.name);
  GAME_ENGINE.addEntity(nxt_user);
}
// the "main" code begins here
function initAssets(prev_data) {
  ASSET_MANAGER = new AssetManager();
  for(var index = 0; index < prev_data.all_images.length; index++) {
    ASSET_MANAGER.queueDownload(prev_data.all_images[index]);
  }
  ASSET_MANAGER.downloadAll(function () {
      console.log("starting up da sheild");
      var canvas = document.getElementById('gameWorld');
      var ctx = canvas.getContext('2d');
      ctx.font = "15px Georgia";
      var sprite = ASSET_MANAGER.getAsset(prev_data.user_avatar);
      console.log("the type of the variable " + typeof sprite);
      GAME_ENGINE = new GameEngine();
      var gameboard = new GameBoard();
      GAME_ENGINE.addEntity(gameboard);
      GAME_ENGINE.name = prev_data.myName;
      var user = new UserSprite(sprite,1,1,GAME_ENGINE.name);//initialize this user to 1 1
      GAME_ENGINE.addEntity(user);
      if(prev_data.conv_exists) {//if previous data exists
        GAME_ENGINE.name = prev_data.myName;
        setData(prev_data.all_lines,prev_data.cur_line);
        console.log('the current players name is ' + prev_data.myName);
        for(var i = 0; i < prev_data.player_data.length; i++) {
          var prev_player = prev_data.player_data[i];
          console.log(prev_player.name);
          var prev_player_sprite = ASSET_MANAGER.getAsset(prev_player.avatar);
          var nxt_user = new UserSprite(prev_player_sprite,prev_player.data.x,prev_player.data.y,prev_player.name);//testing all users given the same image
          GAME_ENGINE.addEntity(nxt_user);
        }
      }
      console.log("added image asset");
      GAME_ENGINE.init(ctx);
      GAME_ENGINE.start();
  });
}
