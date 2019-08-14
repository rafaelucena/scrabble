app.factory('boardTileFactory', function () {

  var BoardTile = function () {
    this.letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'M', 'N', 'O', 'P', 'Q'];
    this.alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    this.vertical = false;
    this.horizontal = false;
    this.boardRoad = {
      'north': [],
      'south': [],
      'west': [],
      'east': [],
    };
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
    if (this.vertical === true || this.horizontal === true) { return true; }
    return false;
  };

  BoardTile.prototype.checkNextTile = function (tileToCheck, placedTile) {
    var tileToCheckCoords = this.reverseConvert(tileToCheck);
    var placedTileCoords = this.reverseConvert(placedTile);
    if (this.vertical === true) {
      return this.isAboveOrBelow(tileToCheckCoords, placedTileCoords);
    }
    else if (this.horizontal === true) {
      return this.isEitherSide(tileToCheckCoords, placedTileCoords);
    }
    return this.isOnAnySide(tileToCheckCoords, placedTileCoords);
  };

  BoardTile.prototype.mapRoadBlockDirections = function (placedTile) {
    var placedTileCoords = {};
    placedTileCoords.latitude = placedTile.charAt(0);
    placedTileCoords.latitudeIndex = this.alphabet.indexOf(placedTileCoords.latitude);
    placedTileCoords.longitude = placedTile.charAt(1);
    placedTileCoords.address = placedTile;

    var directions = ['north', 'south', 'west', 'east'];

    for (var i in directions) {
      this.checkRoadBlock(placedTileCoords, directions[i]);
    }
  };

  BoardTile.prototype.checkRoadBlock = function (placedTileCoords, direction) {
    var checkTileCoords = {};

    switch (direction) {
      case 'north':
      case 'south':
        if (direction === 'north') {
          checkTileCoords.latitudeIndex = Number(placedTileCoords.latitudeIndex) - 1;
        } else {
          checkTileCoords.latitudeIndex = Number(placedTileCoords.latitudeIndex) + 1;
        }
        checkTileCoords.latitude = this.alphabet.charAt(checkTileCoords.latitudeIndex);
        checkTileCoords.longitude = placedTileCoords.longitude;
        checkTileCoords.address = checkTileCoords.latitude + checkTileCoords.longitude;
        break;
      case 'west':
      case 'east':
        checkTileCoords.latitudeIndex = placedTileCoords.latitudeIndex;
        checkTileCoords.latitude = placedTileCoords.latitude;
        if (direction === 'west') {
          checkTileCoords.longitude = Number(placedTileCoords.longitude) - 1;
        } else {
          checkTileCoords.longitude = Number(placedTileCoords.longitude) + 1;
        }
        checkTileCoords.address = checkTileCoords.latitude + checkTileCoords.longitude;
        break;
    }

    if (checkTileCoords.length !== 0 && this.boardMap[checkTileCoords.latitude][checkTileCoords.address] !== undefined) {
      this.boardRoad[direction][checkTileCoords.address] = this.boardMap[checkTileCoords.latitude][checkTileCoords.address];
      return true;
    }

    return false;
  };

  BoardTile.prototype.resetDirection = function () {
    this.vertical = false;
    this.horizontal = false;
    this.boardRoad = {
      'north': [],
      'south': [],
      'west': [],
      'east': [],
    };
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
    if (this.vertical === true) {
      return this.showTilesLaidVertically(tileToCheck, playerInput);
    } else if (this.horizontal === true) {
      return this.showTilesLaidHorizontally(tileToCheck, playerInput);
    }
  };

  BoardTile.prototype.determineDirection = function (playerInput) {
    if (playerInput.length === 1) {
      return;
    }
    var placedTile = this.reverseConvert(playerInput[0].position);
    var tileToCheck = this.reverseConvert(playerInput[1].position);
    if (this.isAboveOrBelow(tileToCheck, placedTile) === true) {
      this.vertical = true;
    } else if (this.isEitherSide(tileToCheck, placedTile) === true) {
      this.horizontal = true;
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
    var placedTile = this.reverseConvert(playerInput[0].position);
    if (this.isOnAnySide(tileToCheck, placedTile)) {
      return 'board-tiles-active';
    }
    return 'board-tiles-inactive';
  };

  BoardTile.prototype.showTilesLaidHorizontally = function (tileToCheck, playerInput) {
    var placedTile = this.reverseConvert(playerInput[0].position);
    if (this.isEitherSide(tileToCheck, placedTile) === true) { return 'board-tiles-active'; }
    placedTile = this.reverseConvert(_.last(playerInput).position);
    if (this.isEitherSide(tileToCheck, placedTile) === true) { return 'board-tiles-active'; }
    return 'board-tiles-inactive';
  };

  BoardTile.prototype.showTilesLaidVertically = function (tileToCheck, playerInput) {
    var placedTile = this.reverseConvert(playerInput[0].position);
    if (this.isAboveOrBelow(tileToCheck, placedTile) === true) { return 'board-tiles-active'; }
    placedTile = this.reverseConvert(_.last(playerInput).position);
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

  BoardTile.prototype.isSameTileColumn = function (tileToCheck, placedTile) {
    return placedTile[0] === tileToCheck[0];
  };

  BoardTile.prototype.isSameTileRow = function (tileToCheck, placedTile) {
    return placedTile[1] === tileToCheck[1];
  };

  return BoardTile;

});
