angular.module('store',['ngRoute'])
  .config(function($routeProvider) {
    console.log('routeProvider is working');
    $routeProvider
      .when('/createDoc', {
        templateUrl:'templates/create-conversation.html',
        controller:'CreateConvController'
      })
      .when('/', {
        templateUrl:'templates/list.html',
        controller:'ListController',
        resolve: {
            conversations: function(Conversations) {
              var conv = Conversations.getConversations();
              return conv;
            }
        }
      })
      .when('/myDocs/:id', {
        templateUrl:'templates/list.html',
        controller: 'ListController',
        resolve: {//get the data for all conversations before rendering the page
            conversations: function(Conversations,User) {
              var conv = Conversations.getConversationsbyId(User.getUserId());
              console.log('returning the conversation ' + conv.data);
              return conv;
            }
        }
      })
      .when('/myDocs', {
        templateUrl:'templates/login.html',
        controller: 'LoginController'
      })
      .when('/createAccount', {
        templateUrl:'templates/login.html',
        controller: 'LoginController'
      })
      .when('/conversations/:id', {
        templateUrl:'templates/note/note.html',
        controller: 'ConversationShowController',
        resolve: {//get info about the conversation before rendering the page
            conversation: function(Conversations,$route) {
              var conv_data = Conversations.getOneConversation($route.current.params.id)//get the conversation by the current params;
              return conv_data;
            }
        }
      })
      .when('/chooseAvatar', {
        templateUrl:'templates/avatar-selector.html',
        controller: 'AvatarController',
        resolve: {
          images: function($http) {
              return $http.get("/avatarImages").
                then(function(res) {
                  return res;
                }, function(res) {
                  alert('error finding images');
                });
          }
        }
      })
      .when('/joinConversation/:id', {
        templateUrl:'templates/game-panel.html',
        controller: 'UpdatePanelController',
        controllerAs:'updateCtrl'
      })
      .otherwise({
        redirectTo: "/"
      })
  })
  .service("Conversations",function($http) {
    console.log('in conversation service');
    this.getConversations = function() {
      return $http.get("/openConv").
        then(function(res) {
          console.log('the function returned ' + res);
          return res;
        }, function(res) {
          alert('error finding conversations');
        });
    };
    this.getConversationsbyId = function(userId) {
      var url = '/userConv/' + userId;
      //console.log('the project id is ' + user.project.project_id);
      return $http.get(url).
        then(function(res) {
          console.log('the function returned ' + res);
          return res;
        }, function(res) {
          alert('error finding conversations');
        });
    };
    this.updateConversation = function(project) {
      var url = '/openConv/' + project.project_id;
      console.log('the url is ' + url);
      return $http.put(url, {mission:project.mission,plan:project.plan,about:project.about}).
        then(function(res) {
          return res;
        }, function(res) {
          alert("couldn't update this conversation");
        });
    };
    this.getOneConversation = function(projectId) {
      var url = '/openConv/' + projectId;
      return $http.get(url).
        then(function(res) {
          console.log('the function returned ' + res);
          return res;
        }, function(res) {
          alert('error finding conversations');
        });
    };
    this.createConversation = function(conversation) {
      return $http.post("/openConv",conversation).
        then(function(res) {
          return res;
        }, function(res) {
          alert(res.data.error);
        });
    };
  })
  .factory("User",['$http',function UserFactory($http) {//to track user projects and credentials
      var project = null;
      var user_id = null;
      var project_avatar = null;
      return {
        setProject : function(newProject) {
          project = newProject;
        },
        getProject : function() {
          return project;
        },
        setProjectAvatar: function(user_avatar) {
          project.user_avatar = user_avatar;
        },
        saveProjectImages: function(images) {//save images to user factory
          project.all_images = images;
        },
        setUserId : function(credentials) {
          user_id = credentials;
        },
        getUserId : function() {
          return user_id;
        },
        verifyUserCredentials : function(user) {
          return $http.get("/verifyUser",{params:{username:user.username, password:user.password, email:user.email}}).
            then(function(res) {
              return res;
            }, function(res) {//connection failed
              alert('could not log you in');
            });
        },
        createUserAccount : function(user) {
          return $http.post("/createUser",user).
            then(function(res) {
              return res;
            }, function(res) {//connection failed
              alert('could not log you in');
            });
        }

      };
  }])
  .controller("LoginController",function($location,$scope,User) {
    var sign_up_toggle = false;
    $scope.verifyUser = function(user) {
      if(!user) {
        alert('missing info');
        return;
      }
      User.verifyUserCredentials(user).then(function(doc){
        if(doc.data) {//user has been verified, proceed to list of documents created by user
          User.setUserId(doc.data._id);
          var userUrl = "/myDocs/" + doc.data._id;
          $location.path(userUrl);
        } else {
          alert('incorrect login info');
        }
      },function(res) {
        alert(res);
      });
    }
    $scope.createUserAccount = function(user) {
      User.createUserAccount(user).then(function(doc){
        if(doc.data) {//user has been verified, proceed to list of documents created by user
          User.setUserId(doc.data._id);
          var userUrl = "/myDocs/" + doc.data._id;
          $location.path(userUrl);
        } else {
          alert('could not create account');
        }
      },function(res) {
        alert(res);
      });
    }
    $scope.toggleSignUp = function() {//used to change visibility of buttons based login/signup mode
        sign_up_toggle ^= true;
    }
    $scope.getSignUp = function() {//return the current mode
        return sign_up_toggle;
    }
    $scope.getHeaderDisplay = function() {
        return sign_up_toggle ? " Create Account" : " Login";
    }
    $scope.getButtonDisplay = function() {
        return sign_up_toggle ? "Login" : "Create Account";
    }
  })
  .controller("ListController",function(conversations,$scope) {
    var active_toggle = false;
    $scope.conversations = conversations.data;
    $scope.toggleActive = function() {
      active_toggle ^= true;
    }
    $scope.convIsActive = function(conversation) {
      return (conversation.player_data.length > 0 || !active_toggle);//display conversation if active or all conversations
    }
    $scope.getActive = function() {
      return active_toggle;
    }
    $scope.getHeaderDisplay = function() {
      return active_toggle ? "Active Conversations":"All Conversations";
    }
    $scope.getButtonDisplay = function() {
      return active_toggle ? "Show All":"Show Active";
    }
  })
  .controller('CreateConvController',function($scope,$location,Conversations,User) {
    $scope.back = function() {
      $location.path('#/');
    }
    $scope.createConv = function(conversation) {
      var user_id = User.getUserId();
      if(user_id) {//if user is logged in, link the conversation to the user
        conversation.author_id = user_id;
      }
      Conversations.createConversation(conversation).then(function(doc){
        if(doc) {
          console.log('the new document is ' + doc.data.project.mission);
          var user_project = doc.data.project;
          user_project.new_doc = true;
          user_project.author = conversation.author;
          user_project.title = conversation.title;
          user_project.project_id = doc.data._id;
          User.setProject(user_project);
          $location.path('/chooseAvatar');
        }
      }, function(res) {
        console.log(res);
        alert(res);
      });
    }
  })
  .controller('UpdatePanelController',function($window,Conversations,User) {
    this.tab = 1;
    this.user = {project: User.getProject()};
    $window.start_edit(this.user);//initialize user in the conversation
    this.project = {};
    this.canEdit = false;
    var that = this.project;
    this.setTab = function(myTab) {
      this.tab = myTab;
    };
    this.isSelected = function(myTab) {
      return this.tab === myTab;
    };
    this.updateUser = function(user) {
      Object.keys(that).forEach(function(key) {
          if(that[key]) {//reset only if values have been set
            user.project[key] = that[key];
            //console.log(user.project[key]);
          }
      })
      saveUser(user.project);
      Object.keys(user.project).forEach(function(key) {
          console.log(user.project[key]);
      })
      this.project = {};
      that = this.project;
      console.log('the user is ' + user.project.mission);
      this.setEdit(false);
    };
    this.editMode = function() {
      return this.canEdit;
    };
    this.setEdit = function(setEdit){
      this.canEdit = setEdit;
    };
    var saveUser = function(project) {
        Conversations.updateConversation(project);
    };
    //this.updateConversation =
  })
  .controller('HeaderController',function($window,User) {
    this.tab = 2;
    $window.document.title = 'Open Docs';
    this.getRedirect = function() {
      var user_id = User.getUserId();
      return user_id ? '#/myDocs/' + user_id : '#/myDocs/';
    };
    this.setTab = function(myTab,title) {
      $window.document.title = title;
      this.tab = myTab;
      if($window.getSocketId()) {//user is in a conversation, remove
        $window.remove();
      }
    };
    this.isSelected = function(myTab) {
      return this.tab === myTab;
    };
  })
  .controller('ConversationShowController',function($scope,$routeParams,$location,conversation,User) {
    $scope.note = conversation.data;
    $scope.joinConversation = function() {
      var cur_project = null;
      if($scope.note.project) {
        cur_project = $scope.note.project;
      } else {
        cur_project = {mission:"Not Set",plan:"Not Set", about:"Not Set"};
      }
      if($scope.note.title) {
        cur_project.title = $scope.note.title;
      }
      cur_project.project_id = $routeParams.id;
      User.setProject(cur_project);
      $location.path('/chooseAvatar');
    }
  })
  .controller('AvatarController',function($location,$scope,User,images) {
    User.saveProjectImages(images.data);
    $scope.images = images.data;
    $scope.joinConversation = function(image_path) {
      console.log(image_path);
      User.setProjectAvatar(image_path);
      var conversationUrl = "/joinConversation/" + User.getProject().project_id;
      $location.path(conversationUrl);
    }
  })
  .directive('gamePanelDirective',['$window', function($window) {
    return {
      link: function(scope, element) {
        element.bind("keydown keypress",function() {
          $window.update();
        });
      }
    };
  }])
  .directive('headerPanels',function() {
    return {
      restrict:'E',
      templateUrl:'templates/header-panels.html',
      controller:function() {
        console.log('header panels');
        this.tab = 1;
        this.setTab = function(myTab) {
          this.tab = myTab;
        };
        this.isSelected = function(myTab) {
          return this.tab === myTab;
        };
      },
      controllerAs:'header'
    };
  });
