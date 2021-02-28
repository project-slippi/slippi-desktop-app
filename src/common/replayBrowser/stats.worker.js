const { parentPort, workerData } = require("worker_threads");
const { SlippiGame } = require("@slippi/slippi-js");
const path = require("path");
const _ = require("lodash");
const moment = require("moment");

const parse = (fullPath) => {
  const game = new SlippiGame(fullPath);
  const filename = path.basename(fullPath);
  const folder = path.dirname(fullPath);
  // Load settings
  const settings = game.getSettings();
  if (!settings || _.isEmpty(settings.players)) {
    throw new Error("Game settings could not be properly loaded.");
  }

  const result = {
    name: filename,
    fullPath,
    settings,
    startTime: null,
    lastFrame: null,
    metadata: null,
    stats: null,
    playerCount: settings.players.length,
    player1: null,
    player2: null,
    player3: null,
    player4: null,
    folder: folder,
  };
  //
  // Load metadata
  const metadata = game.getMetadata();
  if (metadata) {
    result.metadata = metadata;

    if (metadata.lastFrame !== undefined) {
      result.lastFrame = metadata.lastFrame;
    }

    if (metadata.players) {
      const players = metadata.players;
      result.player1 = "0" in players ? players["0"].names.code : null;
      result.player2 = "1" in players ? players["1"].names.code : null;
      result.player3 = "2" in players ? players["2"].names.code : null;
      result.player4 = "3" in players ? players["4"].names.code : null;
    }
  }

  const startAtTime = fileToDateAndTime(metadata ? metadata.startAt : null, filename, result.fullPath);

  if (startAtTime) {
    result.startTime = startAtTime.toISOString();
  }

  const stats = game.getStats();
  if (stats) {
    result.stats = stats;
  }

  return result;
};

workerData.forEach((file) => {
  try {
    const game = parse(file);
    parentPort.postMessage(game);
  } catch (err) {
    console.log(err);
    parentPort.postMessage(null);
  }
});

// Couldn't manage to import the time module lol
// Will remove later

function convertToDateAndTime(dateTimeString) {
  const asMoment = moment(dateTimeString);
  if (asMoment.isValid()) {
    return asMoment.local();
  }

  return null;
}

function fileToDateAndTime(dateTimeString, fileName, fullPath) {
  const startAt = convertToDateAndTime(dateTimeString);
  const getTimeFromFileName = () => filenameToDateAndTime(fileName);
  const getTimeFromBirthTime = () => convertToDateAndTime(fs.statSync(fullPath).birthtime);

  return startAt || getTimeFromFileName() || getTimeFromBirthTime() || null;
}

function filenameToDateAndTime(fileName) {
  const timeReg = /\d{8}T\d{6}/g;
  const filenameTime = fileName.match(timeReg);

  if (filenameTime === null) {
    return null;
  }

  const time = moment(filenameTime[0]).local();
  return time;
}
