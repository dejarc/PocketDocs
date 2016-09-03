angular.module('store')
  .config(function($routeProvider) {
    console.log('routeProvider is working');
    $routeProvider.when('/docs', {
      templateUrl:'templates/game-panel.html'
    });
  });
