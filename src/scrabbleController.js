app.controller('ScrabbleController', ['$http', 'wordsFactory', 'gameFactory', 'boardTileFactory', 'ngDialog', function ($http, wordsFactory, gameFactory, boardTileFactory, ngDialog) {

  var self = this;

  self.gameRules = false;
  self.player1Letters = [];
  self.letterHistory = [];
  self.wordHistory = [];
  self.selected = null;
  self.totalScore = 0;

  var boardTileService = new boardTileFactory();
  var gameService = new gameFactory();
  var wordService = new wordsFactory();

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
    if (self.input.length === 0) {
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
    if (self.wordHistory.length === 0 && self.input.length === 0 && self.gameRules === true) {
      return boardTileService.showStartingTile(x, y);
    }
    var tileToCheck = [x, y];
    if (boardTileService.showLaidTiles(tileToCheck, self.submitted, self.letterHistory) === true) {
      return 'board-tiles-active';
    }
    if (self.submitted.length === 0) { return 'board-tiles-active'; }
    if (self.submitted.length === 1) {
      return boardTileService.showWhenOneTileLaid(tileToCheck, self.submitted);
    }
    return boardTileService.showBoardTiles(tileToCheck, self.submitted);
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

  self.checkForCompoundWord = function () {
    boardTileService.mapRoadBlockDirections(self.submitted);
  };

  self.tileAlreadyAdded = function (tileToCheck) {
    return _.contains(_.pluck(self.submitted, 'position'), tileToCheck);
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
      'blank': isBlank
    };
    self.boardDisplay[tile] = self.selected;
    self.submitted.push(userInput);
    self.input.push(userInput);
    self.organiseSubmission();
    self.selected = null;
  };

  self.canPlace = function (x, y, tile) {
    if (self.disabledTile(x, y) === true || self.selected === null) { return false; }
    if (self.boardDisplay[tile] === undefined) { return true; }
    if (self.boardDisplay[tile].length === 1) { return false; }
  };

  self.organiseSubmission = function () {
    self.submitted = wordService.organiseSubmission(self.submitted);
  };

  self.swapLetter = function () {
    self.player1Letters = gameService.swapLetter(self.player1Letters, self.bag);
    self.selected = null;
  };

  // Playing the word

  self.playWord = function () {
    self.checkForCompoundWord();
    var word = _.pluck(self.submitted, 'letter').join('');
    var config = { params: { 'word': word } };

    $http.get('/word', config).then(function (response) {
      if (response.data.length === 0) {
        return self.notAWord(word);
      }
      return self.isAWord(word, response.data.description);
    });
  };

  self.notAWord = function (word) {
    self.wordHistory.push({ 'word': word, 'points': 0, 'definition': 'Not a word!' });
    self.resetRound();
  };

  self.isAWord = function (word, definition) {
    self.getPoints(word, definition);
    self.player1Letters = wordService.removePlacedLetters(self.player1Letters);
    self.distributeNewLetters();
    self.updateLetterHistory();
    self.resetInput();
    boardTileService.resetDirection();
  };

  self.updateLetterHistory = function () {
    _.each(self.input, function (letter) {
      boardTileService.setBoardMap(letter);
      self.letterHistory.push(letter);
    });
  };

  self.getPoints = function (word, definition) {
    var points = gameService.getPoints(self.submitted);
    self.wordHistory.push({ 'word': word, 'points': points, 'definition': definition });
    self.totalScore += points;
  };

  // Clearing

  self.resetRound = function () {
    self.removeTileFromDisplay();
    self.resetInput();
    self.removeAllPlacedClasses();
  };

  self.removeTileFromDisplay = function () {
    _.each(_.pluck(self.input, 'position'), function (position) {
      self.boardDisplay[position] = self.bonuses[position];
    });
    boardTileService.resetDirection();
  };

  self.clear = function () {
    self.removeTileFromDisplay();
    self.removeAllPlacedClasses();
    self.resetInput();
  };

  self.resetInput = function () {
    self.input = [];
    self.submitted = [];
  };
}]);
