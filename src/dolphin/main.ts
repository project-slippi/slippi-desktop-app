import { isLinux, isMac } from "common/constants";
import { app } from "electron";
import * as fs from "fs-extra";
import path from "path";

import { fileExists } from "../main/fileExists";
import { assertDolphinInstallations } from "./downloadDolphin";
import {
  ipc_checkDesktopAppDolphin,
  ipc_checkPlayKeyExists,
  ipc_clearDolphinCache,
  ipc_configureDolphin,
  ipc_downloadDolphin,
  ipc_fetchGeckoCodes,
  ipc_fetchSysInis,
  ipc_importDolphinSettings,
  ipc_launchNetplayDolphin,
  ipc_reinstallDolphin,
  ipc_removePlayKeyFile,
  ipc_storePlayKeyFile,
  ipc_viewSlpReplay,
  ipc_convertGeckoToRaw,
  ipc_toggleGeckos,
  ipc_addGeckoCode,
  ipc_deleteGecko,
} from "./ipc";
import { dolphinManager } from "./manager";
import { deletePlayKeyFile, findPlayKey, writePlayKeyFile } from "./playkey";
import { DolphinLaunchType } from "./types";
import {
  findDolphinExecutable,
  updateBootToCssCode,
  findSysFolder,
  findUserFolder,
  getUserIni,
  loadCodes,
} from "./util";
import { saveCodes, geckoCodeToRaw, setEnabledDisabledFromTCodes, TruncGeckoCode, removeGeckoCode } from "./geckoCode";
import { IniFile } from "./iniFile";

ipc_fetchGeckoCodes.main!.handle(async ({ dolphinType, iniName }) => {
  console.log("fetching gecko codes...");
  const gCodes = await loadCodes(dolphinType, iniName);
  const tCodes: TruncGeckoCode[] = [];
  gCodes.forEach((gCode) => {
    const tCode: TruncGeckoCode = {
      name: gCode.name,
      enabled: gCode.enabled,
      userDefined: gCode.userDefined,
    };
    tCodes.push(tCode);
  });
  return { tCodes: tCodes };
});

ipc_fetchSysInis.main!.handle(async ({ dolphinType }) => {
  console.log("fetching sys inis...");
  const sysIniFolderPath = path.join(await findSysFolder(dolphinType), "GameSettings");
  const sysFilesArray = await fs.readdir(sysIniFolderPath);
  return { sysInis: sysFilesArray };
});

ipc_convertGeckoToRaw.main!.handle(async ({ geckoCodeName, iniName, dolphinType }) => {
  console.log("converting gecko code to raw...");
  const gCodes = await loadCodes(dolphinType, iniName);
  const code = gCodes.find((gCode) => gCode.name === geckoCodeName);
  let rawGecko = "";
  if (code !== undefined) {
    rawGecko = geckoCodeToRaw(code);
  }
  return { rawGecko: rawGecko };
});

ipc_toggleGeckos.main!.handle(async ({ tCodes, iniName, dolphinType }) => {
  console.log("toggling gecko codes...");
  const gCodes = await loadCodes(dolphinType, iniName);
  const userIniPath = path.join(await findUserFolder(dolphinType), "GameSettings", getUserIni(iniName));
  const userIni = new IniFile();
  await userIni.load(userIniPath, false);
  setEnabledDisabledFromTCodes(gCodes, tCodes);
  saveCodes(userIni, gCodes);
  userIni.save(userIniPath);
  return { success: true };
});

ipc_addGeckoCode.main!.handle(async ({ gCode, iniName, dolphinType }) => {
  console.log("adding gecko code...");
  const gCodes = await loadCodes(dolphinType, iniName);
  gCodes.push(gCode);
  const userIniPath = path.join(await findUserFolder(dolphinType), "GameSettings", getUserIni(iniName));
  const userIni = new IniFile();
  await userIni.load(userIniPath, false);
  saveCodes(userIni, gCodes);
  userIni.save(userIniPath);
  return { success: true };
});

ipc_deleteGecko.main!.handle(async ({ geckoCodeName, iniName, dolphinType }) => {
  console.log("deleting gecko code...");
  let gCodes = await loadCodes(dolphinType, iniName);
  gCodes = removeGeckoCode(geckoCodeName, gCodes);
  const userIniPath = path.join(await findUserFolder(dolphinType), "GameSettings", getUserIni(iniName));
  const userIni = new IniFile();
  await userIni.load(userIniPath, false);
  saveCodes(userIni, gCodes);
  userIni.save(userIniPath);
  return { success: true };
});

ipc_downloadDolphin.main!.handle(async () => {
  await assertDolphinInstallations();
  return { success: true };
});

ipc_configureDolphin.main!.handle(async ({ dolphinType }) => {
  console.log("configuring dolphin...");
  await dolphinManager.configureDolphin(dolphinType);
  return { success: true };
});

ipc_reinstallDolphin.main!.handle(async ({ dolphinType }) => {
  console.log("reinstalling dolphin...");
  await dolphinManager.reinstallDolphin(dolphinType);
  return { success: true };
});

ipc_clearDolphinCache.main!.handle(async ({ dolphinType }) => {
  console.log("clearing dolphin cache...");
  await dolphinManager.clearCache(dolphinType);
  return { success: true };
});

ipc_storePlayKeyFile.main!.handle(async ({ key }) => {
  await writePlayKeyFile(key);
  return { success: true };
});

ipc_checkPlayKeyExists.main!.handle(async () => {
  const keyPath = await findPlayKey();
  const exists = await fileExists(keyPath);
  return { exists };
});

ipc_removePlayKeyFile.main!.handle(async () => {
  await deletePlayKeyFile();
  return { success: true };
});

ipc_viewSlpReplay.main!.handle(async ({ files }) => {
  await dolphinManager.launchPlaybackDolphin("playback", {
    mode: "queue",
    queue: files,
  });
  return { success: true };
});

ipc_launchNetplayDolphin.main!.handle(async ({ bootToCss }) => {
  // Boot straight to CSS if necessary
  await updateBootToCssCode({ enable: Boolean(bootToCss) });

  // Actually launch Dolphin
  await dolphinManager.launchNetplayDolphin();
  return { success: true };
});

ipc_importDolphinSettings.main!.handle(async ({ toImportDolphinPath, type }) => {
  if (isMac) {
    toImportDolphinPath = path.join(toImportDolphinPath, "Contents", "Resources");
  } else {
    toImportDolphinPath = path.dirname(toImportDolphinPath);
  }

  await dolphinManager.copyDolphinConfig(type, toImportDolphinPath);

  return { success: true };
});

ipc_checkDesktopAppDolphin.main!.handle(async () => {
  // get the path and check existence
  const desktopAppPath = path.join(app.getPath("appData"), "Slippi Desktop App");
  let exists = await fs.pathExists(desktopAppPath);

  if (!exists) {
    return { dolphinPath: "", exists: false };
  }

  // Linux doesn't need to do anything because their dolphin settings are in a user config dir
  if (isLinux && exists) {
    await fs.remove(desktopAppPath);
    return { dolphinPath: "", exists: false };
  }

  const dolphinFolderPath = path.join(desktopAppPath, "dolphin");
  exists = await fs.pathExists(dolphinFolderPath);

  const dolphinExecutablePath = await findDolphinExecutable(DolphinLaunchType.NETPLAY, dolphinFolderPath);

  return { dolphinPath: dolphinExecutablePath, exists: exists };
});
