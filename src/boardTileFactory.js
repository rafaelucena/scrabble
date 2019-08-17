app.factory('boardTileFactory', function () {

  var BoardTile = function () {
    this.letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'M', 'N', 'O', 'P', 'Q'];
    this.alphabet = '_ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    this.direction = '';
    this.boardMap = {
      "A": {},
      "B": {},
      "C": {},
      "D": {},
      "E": {},
      "F": {},
      "G": {},
      "H": {},
      "I": {},
      "J": {},
      "K": {},
      "L": {},
      "M": {},
      "N": {},
      "O": {},
    };
  };

  BoardTile.prototype.setBoardMap = function (letter) {
    var index = letter.position.charAt(0);
    this.boardMap[index][letter.position] = letter;
  };

  BoardTile.prototype.hasDirection = function () {
    if (this.direction !== '') {
      return true;
    }
    return false;
  };

  BoardTile.prototype.checkNextTile = function (tileToCheck, placedTile) {
    var tileToCheckCoords = this.reverseConvert(tileToCheck);
    var placedTileCoords = this.reverseConvert(placedTile);
    if (this.direction === 'vertical') {
      return this.isAboveOrBelow(tileToCheckCoords, placedTileCoords);
    } else if (this.direction === 'horizontal') {
      return this.isEitherSide(tileToCheckCoords, placedTileCoords);
    }
    return this.isOnAnySide(tileToCheckCoords, placedTileCoords);
  };

  BoardTile.prototype.resetDirection = function () {
    this.direction = '';
  };

  BoardTile.prototype.setTile = function (x, y, board) {
    var tile = board[this.convert(x, y)];
    if (tile === null) { return; }
    if (tile === undefined) { return 'empty'; }
    if (tile.length === 1 || tile === 'blank') { return 'letter-' + tile; }
    return tile;
  };

  BoardTile.prototype.convert = function (x, y) {
    return this.letters[x] + String(y + 1);
  };

  BoardTile.prototype.reverseConvert = function (tile) {
    var splitTile = _.initial(tile.split(/(\d+)/));
    splitTile[0] = _.indexOf(this.letters, splitTile[0]);
    splitTile[1] = parseInt(splitTile[1], 10) - 1;
    return splitTile;
  };

  BoardTile.prototype.showStartingTile = function (x, y) {
    if (x === 7 && y === 7) {
      return 'board-tiles-active';
    }
    return 'board-tiles-inactive';
  };

  BoardTile.prototype.showBoardTiles = function (tileToCheck, playerInput) {
    if (this.hasDirection() === false) {
      this.determineDirection(playerInput);
    }
    if (this.direction === 'vertical') {
      return this.showTilesLaidVertically(tileToCheck, playerInput);
    } else if (this.direction === 'horizontal') {
      return this.showTilesLaidHorizontally(tileToCheck, playerInput);
    }
  };

  BoardTile.prototype.determineDirection = function (playerInput) {
    if (playerInput.length === 1) {
      return;
    }
    var placedTile = this.reverseConvert(playerInput.reference);
    var tileToCheck = this.reverseConvert(playerInput.last);
    if (this.isAboveOrBelow(tileToCheck, placedTile) === true) {
      this.direction = 'vertical';
    } else if (this.isEitherSide(tileToCheck, placedTile) === true) {
      this.direction = 'horizontal';
    }
  };

  BoardTile.prototype.showLaidTiles = function (tileToCheck, playerInput, letterHistory) {
    var x = tileToCheck[0];
    var y = tileToCheck[1];
    for (var i in playerInput) {
      if (this.convert(x, y) === playerInput[i].position) { return true; }
    }
    for (var j in letterHistory) {
      if (this.convert(x, y) === letterHistory[j].position) { return true; }
    }
  };

  BoardTile.prototype.showWhenOneTileLaid = function (tileToCheck, playerInput) {
    var placedTile = this.reverseConvert(playerInput.reference);
    if (this.isOnAnySide(tileToCheck, placedTile)) {
      return 'board-tiles-active';
    }
    return 'board-tiles-inactive';
  };

  BoardTile.prototype.showTilesLaidHorizontally = function (tileToCheck, playerInput) {
    var placedTile = this.reverseConvert(playerInput.reference);
    if (this.isEitherSide(tileToCheck, placedTile) === true) { return 'board-tiles-active'; }
    placedTile = this.reverseConvert(playerInput.last);
    if (this.isEitherSide(tileToCheck, placedTile) === true) { return 'board-tiles-active'; }
    return 'board-tiles-inactive';
  };

  BoardTile.prototype.showTilesLaidVertically = function (tileToCheck, playerInput) {
    var placedTile = this.reverseConvert(playerInput.reference);
    if (this.isAboveOrBelow(tileToCheck, placedTile) === true) { return 'board-tiles-active'; }
    placedTile = this.reverseConvert(playerInput.last);
    if (this.isAboveOrBelow(tileToCheck, placedTile) === true) { return 'board-tiles-active'; }
    return 'board-tiles-inactive';
  };

  BoardTile.prototype.isOnAnySide = function (tileToCheck, placedTile) {
    return this.isSameTileColumn(tileToCheck, placedTile) || this.isSameTileRow(tileToCheck, placedTile);
  };

  BoardTile.prototype.isEitherSide = function (tileToCheck, placedTile) {
    return this.isSameTileRow(tileToCheck, placedTile);
  };

  BoardTile.prototype.isAboveOrBelow = function (tileToCheck, placedTile) {
    return this.isSameTileColumn(tileToCheck, placedTile);
  };

  BoardTile.prototype.isSameTileRow = function (tileToCheck, placedTile) {
    return placedTile[0] === tileToCheck[0];
  };

  BoardTile.prototype.isSameTileColumn = function (tileToCheck, placedTile) {
    return placedTile[1] === tileToCheck[1];
  };

  return BoardTile;

});
