import { IniFile } from "./iniFile";

export interface GeckoCode {
  name: string;
  creator: string | null;
  notes: string[];
  codeLines: string[];
  enabled: boolean;
  defaultEnabled: boolean;
  userDefined: boolean;
}

export interface TruncGeckoCode {
  name: string;
  enabled: boolean;
  userDefined: boolean;
}

// this is very similar to LoadCodes in GeckoCodeConfig.cpp, but skips the address and data because we don't need them
export function loadGeckoCodes(globalIni: IniFile, localIni?: IniFile): GeckoCode[] {
  const gcodes: GeckoCode[] = [];
  [globalIni, localIni].forEach((ini) => {
    if (ini === undefined) {
      return;
    }
    const lines: string[] = ini.getLines("Gecko", false).filter((line) => {
      return line.length !== 0 || line[0] !== "#";
    });
    let gcode: GeckoCode = {
      name: "",
      creator: "",
      enabled: false,
      defaultEnabled: false,
      userDefined: ini === localIni,
      notes: [],
      codeLines: [],
    };

    lines.forEach((line) => {
      switch (line[0]) {
        // code name
        case "$": {
          if (gcode.name.length > 0) {
            gcodes.push(gcode);
          }
          line = line.slice(1); // cut out the $

          const creatorMatch = line.match(/\[(.*?)\]/); // searches for brackets, catches anything inside them
          const creator = creatorMatch !== null ? creatorMatch[1] : creatorMatch;
          const name = creator ? line.split("[")[0] : line;

          gcode = {
            ...gcode,
            name: name.trim(),
            creator: creator,
            notes: [],
            codeLines: [],
          };
          break;
        }
        // comments
        case "*": {
          gcode.notes.push(line.slice(1));
          break;
        }
        default: {
          gcode.codeLines.push(line);
        }
      }
    });
    if (gcode.name.length > 0) {
      gcodes.push(gcode);
    }

    //update enabled flags

    readEnabledAndDisabled(ini, gcodes);

    //set default enabled
    if (ini === globalIni) {
      gcodes.forEach((gcode) => {
        gcode.defaultEnabled = gcode.enabled;
      });
    }
  });
  return gcodes;
}

function readEnabledOrDisabled(iniFile: IniFile, section: string, enabled: boolean, codes: GeckoCode[]) {
  const lines = iniFile.getLines(section);

  lines.forEach((line) => {
    if (line.length === 0 || line[0] !== "$") {
      return;
    }

    const codeName = line.slice(1);

    codes.forEach((code) => {
      if (codeName.trim() === code.name.trim()) {
        code.enabled = enabled;
      }
    });
  });
}

function readEnabledAndDisabled(iniFile: IniFile, codes: GeckoCode[]) {
  readEnabledOrDisabled(iniFile, "Gecko_Enabled", true, codes);
  readEnabledOrDisabled(iniFile, "Gecko_Disabled", false, codes);
}

function makeGeckoCodeTitle(code: GeckoCode): string {
  const title = `$${code.name}`;
  if (code.creator !== null && code.creator.length > 0) {
    return `${title} [${code.creator}]`;
  }
  return title;
}

function makeGeckoCode(code: GeckoCode, lines: string[]) {
  if (!code.userDefined) {
    return;
  }

  lines.push(makeGeckoCodeTitle(code));

  code.notes.forEach((line) => lines.push(`*${line}`));

  code.codeLines.forEach((line) => lines.push(line));
}

export function saveCodes(iniFile: IniFile, codes: GeckoCode[]) {
  const lines: string[] = [];
  const enabledLines: string[] = [];
  const disabledLines: string[] = [];

  codes.forEach((code) => {
    if (code.enabled !== code.defaultEnabled) {
      (code.enabled ? enabledLines : disabledLines).push("$" + code.name);
    }
    makeGeckoCode(code, lines);
  });

  iniFile.setLines("Gecko_Enabled", enabledLines);
  iniFile.setLines("Gecko_Disabled", disabledLines);
  iniFile.setLines("Gecko", lines);
}

export function makeGeckoCodeFromRaw(rawGecko: string) {
  const rawGeckoLines = rawGecko.split("\n");
  let newCode: GeckoCode = {
    name: "",
    creator: "",
    enabled: true,
    defaultEnabled: false,
    userDefined: true,
    notes: [],
    codeLines: [],
  };

  //fill out gecko info
  rawGeckoLines.forEach((line) => {
    switch (line[0]) {
      // code name
      case "$": {
        line = line.slice(1); // cut out the $

        const creatorMatch = line.match(/\[(.*?)\]/); // searches for brackets, catches anything inside them
        const creator = creatorMatch !== null ? creatorMatch[1] : creatorMatch;
        const name = creator ? line.split("[")[0] : line;

        newCode = {
          ...newCode,
          name: name.trim(),
          creator: creator,
          notes: [],
          codeLines: [],
        };
        break;
      }
      // comments
      case "*": {
        newCode.notes.push(line.slice(1));
        break;
      }
      default: {
        newCode.codeLines.push(line);
      }
    }
  });
  return newCode;
}

export function removeGeckoCode(geckoCodeName: string, codes: GeckoCode[]) {
  return codes.filter((code) => code.name !== geckoCodeName);
}

export function geckoCodeToRaw(code: GeckoCode) {
  let rawGecko = makeGeckoCodeTitle(code);
  code.notes.forEach((line) => (rawGecko = rawGecko.concat("\n", `*${line}`)));
  code.codeLines.forEach((line) => (rawGecko = rawGecko.concat("\n", line)));
  return rawGecko;
}

export function setEnabledDisabledFromTCodes(gCodes: GeckoCode[], tCodes: TruncGeckoCode[]) {
  tCodes.forEach((tCode) => {
    const gCodeIndex = gCodes.findIndex((gCode) => gCode.name === tCode.name);
    if (gCodeIndex !== -1) {
      gCodes[gCodeIndex].enabled = tCode.enabled;
    }
  });
}
