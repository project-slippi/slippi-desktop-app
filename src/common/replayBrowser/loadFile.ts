import { GameStartType, MetadataType, SlippiGame } from "@slippi/slippi-js";
import _ from "lodash";

import { fileToDateAndTime } from "../time";
import { FileDetails, FileHeader } from "./types";

export async function loadFiles(
  fileHeaders: FileHeader[],
  callback: (path: string, details: FileDetails) => void,
  errorCallback: (path: string, err: Error) => void,
  shouldCancel: () => boolean,
): Promise<void> {
  let cancel = false;
  let stopLoop = false;

  // Start an asynchronous loop to check for cancellation.
  (async () => {
    while (!cancel && !stopLoop) {
      cancel = await shouldCancel();
    }
  })();

  for (const header of fileHeaders) {
    if (cancel) {
      break;
    }
    try {
      callback(header.fullPath, loadFile(header));
    } catch (err) {
      errorCallback(header.fullPath, err);
    }
    // Yield control before the next loop. This gives the cancellation loop a
    // chance to run.
    await setImmediatePromise();
  }
  // Stop the cancellation loop.
  stopLoop = true;
}

function setImmediatePromise(): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(() => resolve());
  });
}

function loadFile(fileHeader: FileHeader): FileDetails {
  const game = new SlippiGame(fileHeader.fullPath);
  // Load settings
  const settings: GameStartType | null = game.getSettings();
  if (!settings || _.isEmpty(settings.players)) {
    throw new Error("Game settings could not be properly loaded.");
  }

  const details: FileDetails = {
    settings,
    startTime: null,
    lastFrame: null,
    metadata: null,
  };

  // Load metadata
  const metadata: MetadataType | null = game.getMetadata();
  if (metadata) {
    details.metadata = metadata;

    if (metadata.lastFrame !== undefined) {
      details.lastFrame = metadata.lastFrame;
    }
  }

  const startAtTime = fileToDateAndTime(metadata ? metadata.startAt : null, fileHeader);

  if (startAtTime) {
    details.startTime = startAtTime.toISOString();
  }

  return details;
}
