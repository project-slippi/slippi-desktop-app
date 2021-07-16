import "@broadcast/main";
import "@dolphin/main";
import "@replays/main";
import "@settings/main";
import "@console/main";

import { settingsManager } from "@settings/settingsManager";
import { isDevelopment } from "common/constants";
import {
  ipc_checkValidIso,
  ipc_copyLogsToClipboard,
  ipc_deleteDesktopAppPath,
  ipc_fetchNewsFeed,
  ipc_installUpdate,
  ipc_launcherUpdateDownloadingEvent,
  ipc_launcherUpdateFoundEvent,
  ipc_launcherUpdateReadyEvent,
} from "common/ipc";
import { IsoValidity } from "common/types";
import { app, clipboard, ipcMain, nativeImage } from "electron";
import log from "electron-log";
import { autoUpdater, ProgressInfo, UpdateInfo } from "electron-updater";
import * as fs from "fs-extra";
import os from "os";
import osName from "os-name";
import path from "path";

import { fetchNewsFeedData } from "./newsFeed";
import { readLastLines } from "./util";
import { verifyIso } from "./verifyIso";

const LINES_TO_READ = 200;

export function setupListeners() {
  ipcMain.on("onDragStart", (event, files: string[], imageURL: string) => {
    const icon =
      imageURL.length > 0
        ? nativeImage.createFromDataURL(imageURL)
        : nativeImage.createFromPath(path.join(__static, "images", "file.png"));

    // The Electron.Item type declaration is missing the files attribute
    // so we'll just cast it as unknown for now.
    event.sender.startDrag(({
      files,
      icon: icon,
    } as unknown) as Electron.Item);
  });

  ipcMain.on("getOsInfoSync", (event) => {
    const release = os.release();
    const name = osName(os.platform(), release);
    event.returnValue = `${name} (${release})`;
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
      return { path, valid: IsoValidity.INVALID };
    }

    try {
      const result = await verifyIso(path);
      return { path, valid: result };
    } catch (err) {
      return { path, valid: IsoValidity.INVALID };
    }
  });

  ipc_deleteDesktopAppPath.main!.handle(async () => {
    // get the path and remove
    const desktopAppPath = path.join(app.getPath("appData"), "Slippi Desktop App");
    await fs.remove(desktopAppPath);

    return { success: true };
  });

  ipc_copyLogsToClipboard.main!.handle(async () => {
    let logsFolder = "";
    if (isDevelopment) {
      logsFolder = path.join(app.getPath("appData"), "Slippi Launcher", "logs");
    } else {
      logsFolder = path.join(app.getPath("userData"), "logs");
    }
    const mainLog = path.join(logsFolder, "main.log");
    const rendererLog = path.join(logsFolder, "renderer.log");

    const mainLogs = await readLastLines(mainLog, LINES_TO_READ);
    const rendererLogs = await readLastLines(rendererLog, LINES_TO_READ);

    clipboard.writeText(`MAIN START\n---------------\n${mainLogs}\n\nRENDERER START\n---------------\n${rendererLogs}`);

    return { success: true };
  });

  // check for updates
  autoUpdater.on("update-available", (info: UpdateInfo) => {
    ipc_launcherUpdateFoundEvent.main!.trigger({ version: info.version }).catch(log.warn);
  });

  autoUpdater.on("download-progress", async (progress: ProgressInfo) => {
    if (progress.total !== 0) {
      ipc_launcherUpdateDownloadingEvent
        .main!.trigger({
          progressPercent: progress.percent,
        })
        .catch(log.warn);
    }
  });

  autoUpdater.on("update-downloaded", () => {
    ipc_launcherUpdateReadyEvent.main!.trigger({}).catch(log.warn);
  });

  ipc_installUpdate.main!.handle(async () => {
    autoUpdater.quitAndInstall(false, true);
    return { success: true };
  });
  autoUpdater.checkForUpdatesAndNotify().catch(log.warn);
}
