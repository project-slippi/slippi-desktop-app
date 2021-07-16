import { settingsManager } from "@settings/settingsManager";
import { app } from "electron";
import log from "electron-log";
import * as fs from "fs-extra";
import { fileExists } from "main/fileExists";
import os from "os";
import path from "path";

import { GeckoCode, loadGeckoCodes, saveCodes } from "./geckoCode";
import { IniFile } from "./iniFile";
import { DolphinLaunchType } from "./types";

export async function findDolphinExecutable(type: DolphinLaunchType, dolphinPath?: string): Promise<string> {
  // Make sure the directory actually exists
  if (!dolphinPath) {
    dolphinPath = settingsManager.getDolphinPath(type);
  }

  await fs.ensureDir(dolphinPath);

  // Check the directory contents
  const files = await fs.readdir(dolphinPath);
  const result = files.find((filename) => {
    switch (process.platform) {
      case "win32":
        return filename.endsWith("Dolphin.exe");
      case "darwin":
        return filename.endsWith("Dolphin.app");
      case "linux":
        return filename.endsWith(".AppImage") || filename.endsWith("dolphin-emu");
      default:
        return false;
    }
  });

  if (!result) {
    throw new Error(`No Dolphin found in: ${dolphinPath}`);
  }

  if (process.platform === "darwin") {
    return path.join(dolphinPath, result, "Contents", "MacOS", "Slippi Dolphin");
  }

  return path.join(dolphinPath, result);
}

export async function findUserFolder(type: DolphinLaunchType): Promise<string> {
  let userPath = "";
  const dolphinPath = settingsManager.getDolphinPath(type);
  switch (process.platform) {
    case "win32": {
      userPath = path.join(dolphinPath, "User");
      break;
    }
    case "darwin": {
      userPath = path.join(dolphinPath, "Slippi Dolphin.app", "Contents", "Resources", "User");
      break;
    }
    case "linux": {
      const configPath = path.join(os.homedir(), ".config");
      const userFolderName = type === DolphinLaunchType.NETPLAY ? "SlippiOnline" : "SlippiPlayback";
      userPath = path.join(configPath, userFolderName);
      break;
    }
    default:
      break;
  }

  await fs.ensureDir(userPath);

  return userPath;
}

export async function findSysFolder(type: DolphinLaunchType): Promise<string> {
  let sysPath = "";
  const dolphinPath = settingsManager.getDolphinPath(type);
  switch (process.platform) {
    case "win32": {
      sysPath = path.join(dolphinPath, "Sys");
      break;
    }
    case "darwin": {
      sysPath = path.join(dolphinPath, "Slippi Dolphin.app", "Contents", "Resources", "Sys");
      break;
    }
    case "linux": {
      sysPath = path.join(app.getPath("userData"), type, "Sys");
      break;
    }
    default:
      break;
  }

  await fs.ensureDir(sysPath);

  return sysPath;
}

export async function addGamePathToInis(gameDir: string): Promise<void> {
  await addGamePathToIni(DolphinLaunchType.NETPLAY, gameDir);
  await addGamePathToIni(DolphinLaunchType.PLAYBACK, gameDir);
}

export async function addGamePathToIni(type: DolphinLaunchType, gameDir: string): Promise<void> {
  const userFolder = await findUserFolder(type);
  const iniPath = path.join(userFolder, "Config", "Dolphin.ini");
  const iniFile = new IniFile();
  if (await fileExists(iniPath)) {
    log.info("Found a Dolphin.ini to update...");
    await iniFile.load(iniPath, false);
    const generalSection = iniFile.getOrCreateSection("General");
    const numPaths = generalSection.get("ISOPaths", "0");
    generalSection.set("ISOPaths", numPaths !== "0" ? numPaths : "1");
    generalSection.set("ISOPath0", gameDir);
  } else {
    log.info("There isn't a Dolphin.ini to update...");
    const generalSection = iniFile.getOrCreateSection("General");
    generalSection.set("ISOPaths", "1");
    generalSection.set("ISOPath0", gameDir);
  }
  iniFile.save(iniPath);
  log.info(`Finished updating ${type} dolphin...`);
}

export async function updateBootToCssCode(options: { enable: boolean }) {
  // Update vanilla ISO configs
  ["GALE01", "GALJ01"].forEach(async (id) => {
    const userPath = await findUserFolder(DolphinLaunchType.NETPLAY);
    const sysPath = await findSysFolder(DolphinLaunchType.NETPLAY);
    const globalIniPath = path.join(sysPath, "GameSettings", `${id}r2.ini`);
    const localIniPath = path.join(userPath, "GameSettings", `${id}.ini`);
    await bootToCss(globalIniPath, localIniPath, options.enable);
  });
}

async function bootToCss(globalIniPath: string, localIniPath: string, enable: boolean) {
  const globalIni = new IniFile();
  const localIni = new IniFile();
  if (await fs.pathExists(globalIniPath)) {
    log.info(`found global ini file: ${globalIniPath}`);
    await globalIni.load(globalIniPath);
  }
  if (await fs.pathExists(localIniPath)) {
    log.info(`found local ini file: ${localIniPath}`);
    await localIni.load(localIniPath);
  }

  const geckoCodes = loadGeckoCodes(globalIni, localIni);
  const bootCodeIdx = geckoCodes.findIndex((code) => code.name === "Boot to CSS");

  if (bootCodeIdx === -1) {
    const bootToCssCode: GeckoCode = {
      codeLines: ["041BFA20 38600002"],
      creator: "Dan Salvato, Achilles",
      defaultEnabled: false,
      enabled: enable,
      name: "Boot to CSS",
      notes: [],
      userDefined: true,
    };
    geckoCodes.push(bootToCssCode);
  } else {
    if (geckoCodes[bootCodeIdx].enabled === enable) {
      return;
    }
    geckoCodes[bootCodeIdx].enabled = enable;
  }

  saveCodes(localIni, geckoCodes);

  localIni.save(localIniPath);
}

export async function loadCodes(dolphinType: DolphinLaunchType, iniName: string) {
  const sysIniPath = path.join(await findSysFolder(dolphinType), "GameSettings", iniName);
  const userIniPath = path.join(await findUserFolder(dolphinType), "GameSettings", getUserIni(iniName));
  const sysIni = new IniFile();
  await sysIni.load(sysIniPath, false);
  const userIni = new IniFile();
  if (await fs.pathExists(userIniPath)) {
    await userIni.load(userIniPath, false);
  } else {
    //create the iniFile if it does not exist
    fs.writeFile(userIniPath, "", (err) => console.log(err));
  }
  return loadGeckoCodes(sysIni, userIni);
}

//find out the appropriate user ini file given the sys ini file
export function getUserIni(sysIniName: string) {
  switch (sysIniName) {
    case "GALE01r2.ini": {
      return "GALE01.ini";
    }
    case "GALJ01r2.ini": {
      return "GALJ01.ini";
    }
    default: {
      return sysIniName;
    }
  }
}
