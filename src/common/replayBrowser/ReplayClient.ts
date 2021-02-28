import { GameFilters, GlobalStats } from "common/game";
import { ipcRenderer } from "electron";

import { FileLoadResult, FileResult, FolderResult } from "./types";

export async function loadReplays(folder: string, progressCallback: (count: number, total: number) => void) {
  return new Promise<FileLoadResult>((resolve, reject) => {
    ipcRenderer.on("load-folder-replays", (_: any, arg: { type: string; value: number[] | FolderResult | any }) => {
      if (arg.type === "error") {
        reject(arg);
        return;
      }
      if (arg.type === "done") {
        ipcRenderer.removeAllListeners("load-folder-replays");
        resolve((arg.value as unknown) as FileLoadResult);
      } else {
        progressCallback(arg.value[0], arg.value[1]);
      }
    });
    ipcRenderer.send("load-folder-replays", folder);
  });
}

export function loadReplayFile(file: string) {
  return new Promise<FileResult>((resolve, reject) => {
    ipcRenderer.once("load-replay-file", (_: any, arg: Error | FileResult) => {
      if (arg instanceof Error) {
        reject(arg);
      }
      resolve(arg as FileResult);
    });
    ipcRenderer.send("load-replay-file", file);
  });
}

export function loadPlayerReplays(player: string, filters: GameFilters) {
  console.log(filters);
  return new Promise<GlobalStats>((resolve, reject) => {
    ipcRenderer.once("load-player-replays", (_: any, arg: Error | GlobalStats) => {
      if (arg instanceof Error) {
        reject(arg);
      }
      resolve(arg as GlobalStats);
    });
    console.log(filters);
    ipcRenderer.send("load-player-replays", player, filters);
  });
}

export async function saveReplay(replay: FileResult) {
  return new Promise<void>((resolve, reject) => {
    ipcRenderer.once("save-replay", (_: any, err: Error | null) => {
      if (err) {
        reject(err);
      }
      resolve();
    });
    ipcRenderer.send("save-replay", replay);
  });
}

export async function saveReplays(replays: string[], progressCallback: (count: number) => void) {
  return new Promise<number>((resolve, reject) => {
    ipcRenderer.on("save-replays", (_: any, arg: { type: string; value: number } | Error) => {
      if (arg instanceof Error) {
        reject(arg);
        return;
      }
      if (arg.type === "done") {
        ipcRenderer.removeAllListeners("save-replays");
        resolve(arg.value);
      } else {
        progressCallback(arg.value);
      }
    });
    ipcRenderer.send("save-replays", replays);
  });
}

export async function deleteReplays(replays: string[]) {
  return new Promise<void>((resolve, reject) => {
    ipcRenderer.once("delete-replays", (_: any, err: Error | null) => {
      if (err) {
        reject(err);
      }
      resolve();
    });
    ipcRenderer.send("delete-replays", replays);
  });
}

export async function deleteFolderReplays(existingFolders: string[]) {
  return new Promise<void>((resolve, reject) => {
    ipcRenderer.once("delete-folders", (_: any, err: Error | null) => {
      if (err) {
        reject(err);
      }
      resolve();
    });
    ipcRenderer.send("delete-folders", existingFolders);
  });
}
