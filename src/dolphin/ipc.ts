import { _, EmptyPayload, makeEndpoint, SuccessPayload } from "../ipc";
import { DolphinLaunchType, PlayKey, ReplayQueueItem } from "./types";
import { GeckoCode, TruncGeckoCode } from "./geckoCode";

// Handlers

export const ipc_downloadDolphin = makeEndpoint.main("downloadDolphin", <EmptyPayload>_, <SuccessPayload>_);

export const ipc_configureDolphin = makeEndpoint.main(
  "configureDolphin",
  <{ dolphinType: DolphinLaunchType }>_,
  <SuccessPayload>_,
);

export const ipc_reinstallDolphin = makeEndpoint.main(
  "reinstallDolphin",
  <{ dolphinType: DolphinLaunchType }>_,
  <SuccessPayload>_,
);

export const ipc_clearDolphinCache = makeEndpoint.main(
  "clearDolphinCache",
  <{ dolphinType: DolphinLaunchType }>_,
  <SuccessPayload>_,
);

export const ipc_storePlayKeyFile = makeEndpoint.main("storePlayKeyFile", <{ key: PlayKey }>_, <SuccessPayload>_);

export const ipc_checkPlayKeyExists = makeEndpoint.main("checkPlayKeyExists", <EmptyPayload>_, <{ exists: boolean }>_);

export const ipc_removePlayKeyFile = makeEndpoint.main("removePlayKeyFile", <EmptyPayload>_, <SuccessPayload>_);

export const ipc_viewSlpReplay = makeEndpoint.main("viewSlpReplay", <{ files: ReplayQueueItem[] }>_, <SuccessPayload>_);

export const ipc_launchNetplayDolphin = makeEndpoint.main(
  "launchNetplayDolphin",
  <{ bootToCss?: boolean }>_,
  <SuccessPayload>_,
);

export const ipc_checkDesktopAppDolphin = makeEndpoint.main(
  "getDesktopAppDolphinPath",
  <EmptyPayload>_,
  <{ dolphinPath: string; exists: boolean }>_,
);

// toImportDolphin path must point to a "Slippi Dolphin.{exe,app}"
export const ipc_importDolphinSettings = makeEndpoint.main(
  "importDolphinSettings",
  <{ toImportDolphinPath: string; type: DolphinLaunchType }>_,
  <SuccessPayload>_,
);

export const ipc_fetchGeckoCodes = makeEndpoint.main(
  "fetchGeckoCodes",
  <{ dolphinType: DolphinLaunchType; iniName: string }>_,
  <{ tCodes: TruncGeckoCode[] }>_,
);

export const ipc_fetchSysInis = makeEndpoint.main(
  "fetchSysInis",
  <{ dolphinType: DolphinLaunchType }>_,
  <{ sysInis: string[] }>_,
);

export const ipc_toggleGeckos = makeEndpoint.main(
  "toggleGeckos",
  <{ tCodes: TruncGeckoCode[]; iniName: string; dolphinType: DolphinLaunchType }>_,
  <SuccessPayload>_,
);

export const ipc_deleteGecko = makeEndpoint.main(
  "deleteGecko",
  <{ geckoCodeName: string; iniName: string; dolphinType: DolphinLaunchType }>_,
  <SuccessPayload>_,
);

export const ipc_addGeckoCode = makeEndpoint.main(
  "addGeckoCode",
  <{ gCode: GeckoCode; iniName: string; dolphinType: DolphinLaunchType }>_,
  <SuccessPayload>_,
);

export const ipc_convertGeckoToRaw = makeEndpoint.main(
  "convertGeckoToRaw",
  <{ geckoCodeName: string; iniName: string; dolphinType: DolphinLaunchType }>_,
  <{ rawGecko: string }>_,
);

// Events

export const ipc_dolphinDownloadFinishedEvent = makeEndpoint.renderer(
  "dolphin_dolphinDownloadFinished",
  <{ error: string | null }>_,
);

export const ipc_dolphinDownloadLogReceivedEvent = makeEndpoint.renderer(
  "dolphin_dolphinDownloadLogReceived",
  <{ message: string }>_,
);
