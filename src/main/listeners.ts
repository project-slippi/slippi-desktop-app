import "@broadcast/main";
import "@dolphin/main";
import "@replays/main";
import "@settings/main";
import "@console/main";

import { settingsManager } from "@settings/settingsManager";
import { ipc_checkValidIso, ipc_fetchNewsFeed } from "common/ipc";
import { ipcMain, nativeImage } from "electron";
import path from "path";

import { fetchNewsFeedData } from "./newsFeed";
import { verifyIso } from "./verifyIso";

export function setupListeners() {
  ipcMain.on("onDragStart", (event, filePath: string) => {
    event.sender.startDrag({
      file: filePath,
      icon: nativeImage.createFromPath(path.join(__static, "images", "file.png")),
    });
  });

  ipcMain.on("getAppSettingsSync", (event) => {
    const settings = settingsManager.get();
    event.returnValue = settings;
  });

  ipc_fetchNewsFeed.main!.handle(async () => {
    const result = await fetchNewsFeedData();
    return result;
  });

  ipc_checkValidIso.main!.handle(async ({ path }) => {
    // Make sure we have a valid path
    if (!path) {
      return { path, valid: false };
    }

    try {
      const result = await verifyIso(path);
      return { path, valid: result.valid };
    } catch (err) {
      return { path, valid: false };
    }
  });
}
