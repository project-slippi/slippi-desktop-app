import { app } from "electron";
import path from "path";

import { AppSettings } from "./types";

function getDefaultRootSlpPath(): string {
  let root = app.getPath("home");
  if (process.platform === "win32") {
    root = app.getPath("documents");
  }
  return path.join(root, "Slippi");
}

export const defaultAppSettings: AppSettings = {
  connections: [],
  settings: {
    isoPath: null,
    slpDirs: [{ path: getDefaultRootSlpPath(), isDefault: true }],
    spectateSlpPath: path.join(getDefaultRootSlpPath(), "Spectate"),
    netplayDolphinPath: path.join(app.getPath("userData"), "netplay"),
    playbackDolphinPath: path.join(app.getPath("userData"), "playback"),
    launchMeleeOnPlay: true,
  },
};
