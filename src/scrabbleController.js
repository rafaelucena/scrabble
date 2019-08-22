app.factory('socket', function($rootScope) {
    var socket = io(); //默认连接部署网站的服务器
    return {
        on: function(eventName, callback) {
            socket.on(eventName, function() {
                var args = arguments;
                $rootScope.$apply(function() {   //手动执行脏检查
                    callback.apply(socket, args);
                });
            });
        },
        emit: function(eventName, data, callback) {
            socket.emit(eventName, data, function() {
                var args = arguments;
                $rootScope.$apply(function() {
                    if(callback) {
                        callback.apply(socket, args);
                    }
                });
            });
        }
    };
});

app.factory('randomColor', function($rootScope) {
    return {
        newColor: function() {
            return '#'+('00000'+(Math.random()*0x1000000<<0).toString(16)).slice(-6);
        }
    };
});

app.factory('userService', function($rootScope) {
    return {
        get: function(users,nickname) {
            if(users instanceof Array){
                for(var i=0;i<users.length;i++){
                    if(users[i].nickname===nickname){
                        return users[i];
                    }
                }
            }else{
                return null;
            }
        }
    };
});

app.controller('ScrabbleController',
    ['$http', '$q', 'wordsFactory', 'gameFactory', 'boardTileFactory', 'ngDialog', '$scope','socket','randomColor','userService', function ($http, $q, wordsFactory, gameFactory, boardTileFactory, ngDialog, $scope,socket,randomColor,userService) {

  var self = this;

  self.gameRules = false;
  self.player1Letters = [];
  self.letterHistory = [];
  self.wordHistory = [];
  self.selected = null;
  self.totalScore = 0;
  self.inputs = {};
  self.words = {};

  var boardTileService = new boardTileFactory();
  var gameService = new gameFactory();
  var wordService = new wordsFactory();

  //
        var messageWrapper= $('.message-wrapper');
        $scope.hasLogined=false;
        $scope.receiver="";//默认是群聊
        $scope.publicMessages=[];//群聊消息
        $scope.privateMessages={};//私信消息
        $scope.messages=$scope.publicMessages;//默认显示群聊
        $scope.users=[];//
        $scope.color=randomColor.newColor();//当前用户头像颜色
        $scope.login=function(){   //登录进入聊天室
            socket.emit("addUser",{nickname:$scope.nickname,color:$scope.color});
        }
        $scope.scrollToBottom=function(){
            messageWrapper.scrollTop(messageWrapper[0].scrollHeight);
        }

        $scope.postMessage=function(){
            var msg={text:$scope.words,type:"normal",color:$scope.color,from:$scope.nickname,to:$scope.receiver};
            var rec=$scope.receiver;
            if(rec){  //私信
                if(!$scope.privateMessages[rec]){
                    $scope.privateMessages[rec]=[];
                }
                $scope.privateMessages[rec].push(msg);
            }else{ //群聊
                $scope.publicMessages.push(msg);
            }
            $scope.words="";
            if(rec!==$scope.nickname) { //排除给自己发的情况
                socket.emit("addMessage", msg);
            }
        }
        $scope.setReceiver=function(receiver){
            $scope.receiver=receiver;
            if(receiver){ //私信用户
                if(!$scope.privateMessages[receiver]){
                    $scope.privateMessages[receiver]=[];
                }
                $scope.messages=$scope.privateMessages[receiver];
            }else{//广播
                $scope.messages=$scope.publicMessages;
            }
            var user=userService.get($scope.users,receiver);
            if(user){
                user.hasNewMessage=false;
            }
        }

        //收到登录结果
        socket.on('userAddingResult',function(data){
            if(data.result){
                $scope.userExisted=false;
                $scope.hasLogined=true;
            }else{//昵称被占用
                $scope.userExisted=true;
            }
        });

        //接收到欢迎新用户消息
        socket.on('userAdded', function(data) {
            if(!$scope.hasLogined) return;
            $scope.publicMessages.push({text:data.nickname,type:"welcome"});
            $scope.users.push(data);
        });

        //接收到在线用户消息
        socket.on('allUser', function(data) {
            if(!$scope.hasLogined) return;
            $scope.users=data;
        });

        //接收到用户退出消息
        socket.on('userRemoved', function(data) {
            if(!$scope.hasLogined) return;
            $scope.publicMessages.push({text:data.nickname,type:"bye"});
            for(var i=0;i<$scope.users.length;i++){
                if($scope.users[i].nickname==data.nickname){
                    $scope.users.splice(i,1);
                    return;
                }
            }
        });

        //接收到新消息
        socket.on('messageAdded', function(data) {
            if(!$scope.hasLogined) return;
            if(data.to){ //私信
                if(!$scope.privateMessages[data.from]){
                    $scope.privateMessages[data.from]=[];
                }
                $scope.privateMessages[data.from].push(data);
            }else{//群发
                $scope.publicMessages.push(data);
            }
            var fromUser=userService.get($scope.users,data.from);
            var toUser=userService.get($scope.users,data.to);
            if($scope.receiver!==data.to) {//与来信方不是正在聊天当中才提示新消息
                if (fromUser && toUser.nickname) {
                    fromUser.hasNewMessage = true;//私信
                } else {
                    toUser.hasNewMessage = true;//群发
                }
            }
        });

  // Game setup

  self.showGameRulesButton = function () {
    $http.get('/config').
      then(function (response) {
        self.gameRules = (response.data.env === 'production');
      });
  };

  self.toggleGameRules = function () {
    self.gameRules = !self.gameRules;
  };

  self.gameRulesButton = function () {
    if (self.gameRules === true) { return 'On'; }
    return 'Off';
  };

  self.resetInputs = function () {
    self.inputs = {
      'direction': '',
      'reference': '',
      'last': '',
      'length': 0,
      'list': {},
    };
  };

  self.setInputs = function (letter) {
    if (self.inputs.reference === '') {
      self.inputs.reference = letter.position;
    }
    self.inputs.last = letter.position;
    self.inputs.length = self.inputs.length + 1;
    self.inputs.list[letter.position] = letter;
  };

  self.setup = function () {
    self.bag = gameService.createBag();
    self.bonuses = gameService.createBoard();
    self.boardDisplay = _.clone(self.bonuses);
    self.distributeNewLetters();
    self.resetInput();
  };

  self.distributeNewLetters = function () {
    if (self.bag.length < (7 - self.player1Letters.length)) {
      console.log('Game Over!');
      return;
    }
    self.player1Letters = gameService.distributeLetters(self.player1Letters, self.bag);
  };

  self.disablePlayWord = function () {
    if (self.inputs.length === 0) {
      return true;
    }
    if (self.gameRules === true && self.wordHistory.length !== 0) {
      return true;
    }
    return false;
  };

  self.shuffleLetters = function () {
    self.player1Letters = _.shuffle(self.player1Letters);
  };

  // Rendering correct tiles

  self.tile = function (x, y) {
    return boardTileService.setTile(x, y, self.boardDisplay);
  };

  // Displaying player letters at correct opacity

  self.showSelected = function (index) {
    return self.player1Letters[index].status;
  };

  self.alreadyPlaced = function (index) {
    return self.player1Letters[index] === 'placed';
  };

  self.removeAllSelectedClass = function () {
    self.player1Letters = wordService.removeAllSelectedClass(self.player1Letters);
  };

  self.removeAllPlacedClasses = function () {
    self.player1Letters = wordService.removeAllPlacedClasses(self.player1Letters);
  };

  self.addSelectedClass = function (index) {
    self.player1Letters = wordService.addSelectedClass(self.player1Letters, index);
  };

  self.addPlacedClass = function () {
    self.player1Letters = wordService.addPlacedClass(self.player1Letters);
  };

  // Display board tiles at correct opacity

  self.showBoardTiles = function (x, y) {
    if (self.wordHistory.length === 0 && self.inputs.length === 0 && self.gameRules === true) {
      return boardTileService.showStartingTile(x, y);
    }
    var tileToCheck = [x, y];
    if (boardTileService.showLaidTiles(tileToCheck, self.inputs.list, self.letterHistory) === true) {
      return 'board-tiles-active';
    }
    if (self.inputs.length === 0) { return 'board-tiles-active'; }
    if (self.inputs.length === 1) {
      return boardTileService.showWhenOneTileLaid(tileToCheck, self.inputs);
    }
    return boardTileService.showBoardTiles(tileToCheck, self.inputs);
  };

  self.disabledTile = function (x, y) {
    return self.showBoardTiles(x, y) === 'board-tiles-inactive';
  };

  // Placing tiles on the board

  self.selectLetter = function (index) {
    if (self.player1Letters[index].status === 'placed') { return; }
    if (self.player1Letters[index].status === 'selected') {
      return self.undoSelect(index);
    }
    self.selected = self.player1Letters[index].value;
    self.removeAllSelectedClass();
    self.addSelectedClass(index);
  };

  self.undoSelect = function (index) {
    self.selected = null;
    self.removeAllSelectedClass();
  };

  self.selectTile = function (x, y) {
    var tile = boardTileService.convert(x, y);
    if (self.canPlace(x, y, tile) === false) {
      return;
    }
    self.addPlacedClass();
    self.addTile(tile);
  };

  self.addTile = function (tile) {
    if (self.selected === 'blank') {
      return self.assignLetterToBlank(tile);
    }
    self.addToInput(tile, false);
  };

  self.getFormedWords = function () {
    self.words = boardTileService.mapFormedWords(self.inputs);
  };

  self.assignLetterToBlank = function (tile) {
    ngDialog.openConfirm({
      template: 'popupForm',
      controller: 'ScrabbleController',
      controllerAs: 'scrbCtrl'
    }).then(function (letter) {
      if (/[a-z]/i.test(letter) === true && letter !== undefined) {
        self.selected = letter.toLowerCase();
        self.addToInput(tile, true);
      }
    });
  };

  self.addToInput = function (tile, isBlank) {
    let userInput = {
      'letter': self.selected,
      'position': tile,
      'blank': isBlank,
      'intercept': '',
    };
    self.boardDisplay[tile] = self.selected;
    self.setInputs(userInput);
    self.selected = null;
  };

  self.canPlace = function (x, y, tile) {
    if (self.disabledTile(x, y) === true || self.selected === null) { return false; }
    if (self.boardDisplay[tile] === undefined) { return true; }
    if (self.boardDisplay[tile].length === 1) { return false; }
  };

  self.swapLetter = function () {
    self.player1Letters = gameService.swapLetter(self.player1Letters, self.bag);
    self.selected = null;
  };

  // Playing the word

  self.playWord = function () {
    self.getFormedWords();

    if (self.words.valid === false) {
      return self.notAWord('');
    }

    var requests = [];
    for (var x in self.words.list) {
      var config = { params: { 'word': self.words.list[x].formed } };
      requests.push($http.get('/word', config));
    }

    $q.all(requests).then(function (response) {
      for (var x = 0; x < response.length; x++) {
        if (response[x].data.length === 0) {
          self.notAWord(response[x].data.word);
        }
      }
      self.validWords(self.words);
    });
  };

  self.notAWord = function (word) {
    self.wordHistory.push({ 'word': word, 'points': 0, 'definition': 'Not a word!' });
    self.resetRound();
  };

  self.validWords = function (words) {
    self.getPoints(words);
    self.player1Letters = wordService.removePlacedLetters(self.player1Letters);
    self.distributeNewLetters();
    self.updateLetterHistory();
    self.resetInput();
    boardTileService.resetDirection();
  };

  self.updateLetterHistory = function () {
    _.each(self.inputs.list, function (letter) {
      boardTileService.setBoardMap(letter);
      self.letterHistory.push(letter);
    });
  };

  self.getPoints = function (words) {
    words.list = gameService.getPoints(words.list);

    for (var x in words.list) {
      self.wordHistory.push({ 'word': words.list[x].formed, 'points': words.list[x].points, 'definition': '' });
      self.totalScore += words.list[x].points;
    }
  };

  // Clearing

  self.resetRound = function () {
    self.removeTileFromDisplay();
    self.resetInput();
    self.removeAllPlacedClasses();
  };

  self.removeTileFromDisplay = function () {
    _.each(self.inputs.list, function (letter) {
      self.boardDisplay[letter.position] = self.bonuses[letter.position];
    });
    boardTileService.resetDirection();
  };

  self.clear = function () {
    self.removeTileFromDisplay();
    self.removeAllPlacedClasses();
    self.resetInputs();
  };

  self.resetInput = function () {
    self.resetInputs();
    self.words = {};
  };
}]);

app.directive('message', ['$timeout',function($timeout) {
    return {
        restrict: 'E',
        templateUrl: 'message.html',
        scope:{
            info:"=",
            self:"=",
            scrolltothis:"&"
        },
        link:function(scope, elem, attrs){
            scope.time=new Date();
            $timeout(scope.scrolltothis);
            $timeout(function(){
                elem.find('.avatar').css('background',scope.info.color);
            });
        }
    };
}])
    .directive('user', ['$timeout',function($timeout) {
        return {
            restrict: 'E',
            templateUrl: 'user.html',
            scope:{
                info:"=",
                iscurrentreceiver:"=",
                setreceiver:"&"
            },
            link:function(scope, elem, attrs,chatCtrl){
                $timeout(function(){
                    elem.find('.avatar').css('background',scope.info.color);
                });
            }
        };
    }]);
