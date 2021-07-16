import { addGamePathToInis } from "@dolphin/util";
import path from "path";

import {
  ipc_addNewConnection,
  ipc_deleteConnection,
  ipc_editConnection,
  ipc_setIsoPath,
  ipc_setLaunchMeleeOnPlay,
  ipc_setNetplayDolphinPath,
  ipc_setPlaybackDolphinPath,
  ipc_setRootSlpPath,
  ipc_setSpectateSlpPath,
} from "./ipc";
import { settingsManager } from "./settingsManager";

// getAppSettings.main!.handle(async () => {
//   const settings = settingsManager.get();
//   return settings;
// });

ipc_setIsoPath.main!.handle(async ({ isoPath }) => {
  await settingsManager.setIsoPath(isoPath);
  if (isoPath) {
    const gameDir = path.dirname(isoPath);
    await addGamePathToInis(gameDir);
  }
  return { success: true };
});

ipc_setRootSlpPath.main!.handle(async ({ path }) => {
  await settingsManager.setSlpDirs(path);
  return { success: true };
});

ipc_setSpectateSlpPath.main!.handle(async ({ path }) => {
  await settingsManager.setSpectateSlpPath(path);
  return { success: true };
});

ipc_setNetplayDolphinPath.main!.handle(async ({ path }) => {
  await settingsManager.setNetplayDolphinPath(path);
  return { success: true };
});

ipc_setPlaybackDolphinPath.main!.handle(async ({ path }) => {
  await settingsManager.setPlaybackDolphinPath(path);
  return { success: true };
});

ipc_addNewConnection.main!.handle(async ({ connection }) => {
  await settingsManager.addConsoleConnection(connection);
  return { success: true };
});

ipc_editConnection.main!.handle(async ({ id, connection }) => {
  await settingsManager.editConsoleConnection(id, connection);
  return { success: true };
});

ipc_deleteConnection.main!.handle(async ({ id }) => {
  await settingsManager.deleteConsoleConnection(id);
  return { success: true };
});

ipc_setLaunchMeleeOnPlay.main!.handle(async ({ launchMelee }) => {
  await settingsManager.setLaunchMeleeOnPlay(launchMelee);
  return { success: true };
});
