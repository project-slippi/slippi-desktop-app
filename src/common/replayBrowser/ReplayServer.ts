import { getGlobalStats } from "common/game";
import { ipcMain } from "electron";

import { getFullReplay, getPlayerReplays, pruneFolders } from "./dao";
import { loadFolder } from "./loadFolder";

export const startReplayServer = () => {
  ipcMain.on("load-folder-replays", async (event, folder) => {
    try {
      const result = await loadFolder(folder, (count, total) =>
        event.reply("load-folder-replays", { type: "callback", value: [count, total] }),
      );
      event.reply("load-folder-replays", { type: "done", value: result });
    } catch (err) {
      console.log(err);
      event.reply("load-folder-replays", { type: "error", value: err });
      return;
    }
  });

  ipcMain.on("load-replay-file", async (event, file) => {
    try {
      event.reply("load-replay-file", await getFullReplay(file));
    } catch (err) {
      event.reply("load-replay-file", err);
    }
  });

  ipcMain.on("load-player-replays", async (event, player, filters) => {
    try {
      event.reply("load-player-replays", getGlobalStats(await getPlayerReplays(player), player, filters));
    } catch (err) {
      event.reply("load-player-replays", err);
    }
  });

  ipcMain.on("delete-folders", async (event, existingFolders) => {
    try {
      event.reply("delete-folders", await pruneFolders(existingFolders));
    } catch (err) {
      event.reply("delete-folders", err);
    }
  });
};
