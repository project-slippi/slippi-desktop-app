import { dolphinManager } from "@dolphin/manager";
import { ipc_statsPageRequestedEvent } from "@replays/ipc";
import { colors } from "common/colors";
import { isDevelopment, isMac } from "common/constants";
import { delay } from "common/delay";
import { app, BrowserWindow, shell } from "electron";
import contextMenu from "electron-context-menu";
import log from "electron-log";
import { autoUpdater } from "electron-updater";
import get from "lodash/get";
import last from "lodash/last";
import path from "path";
import url, { format as formatUrl } from "url";

import { download } from "./download";
import { fileExists } from "./fileExists";
import { setupListeners } from "./listeners";

// Check for updates
autoUpdater.logger = log;
autoUpdater.checkForUpdatesAndNotify().catch(log.warn);

// global reference to mainWindow (necessary to prevent window from being garbage collected)
let mainWindow: BrowserWindow | null = null;
let didFinishLoad = false;

// Only allow a single Slippi App instance
const lockObtained = app.requestSingleInstanceLock();
if (!lockObtained) {
  app.quit();
}

function createMainWindow() {
  const window = new BrowserWindow({
    show: false,
    width: 1100,
    height: 728,
    minHeight: isDevelopment ? undefined : 450,
    minWidth: isDevelopment ? undefined : 900,
    backgroundColor: colors.purpleDarker,
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      enableRemoteModule: true,
    },
    autoHideMenuBar: true,
  });

  if (isDevelopment) {
    window.webContents.openDevTools();

    // Enable context menu for inspecting elements
    contextMenu();
  }

  if (isDevelopment) {
    void window.loadURL(`http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}`);
  } else {
    void window.loadURL(
      formatUrl({
        pathname: path.join(__dirname, "index.html"),
        protocol: "file",
        slashes: true,
      }),
    );
  }

  window.on("close", (event) => {
    // Don't actually close the window on Mac just hide it
    if (isMac) {
      event.preventDefault();
      window.hide();
    }
  });

  window.on("closed", () => {
    mainWindow = null;
  });

  window.webContents.on("devtools-opened", () => {
    window.focus();
    setImmediate(() => {
      window.focus();
    });
  });

  // Automatically open new-tab/new-window URLs in their default browser
  window.webContents.on("new-window", (event: Event, url: string) => {
    event.preventDefault();
    void shell.openExternal(url);
  });

  window.once("ready-to-show", () => {
    didFinishLoad = true;
    window.show();
    window.focus();
  });

  setupListeners();

  return window;
}

// quit application when all windows are closed
app.on("window-all-closed", () => {
  // on macOS it is common for applications to stay open until the user explicitly quits
  if (!isMac) {
    app.quit();
  }
});

app.on("activate", () => {
  // on macOS it is common to re-create a window even after all windows have been closed
  if (mainWindow === null) {
    mainWindow = createMainWindow();
  }
});

const onReady = () => {
  if (!lockObtained) {
    return;
  }
  mainWindow = createMainWindow();

  // Handle Slippi URI if provided
  const argURI = get(process.argv, 1);
  if (argURI) {
    handleSlippiURI(argURI);
  }
};

if (isDevelopment) {
  // There's an issue with Windows 10 dark mode where the ready event doesn't fire
  // when running in dev mode. Use the prepend listener to work around this.
  // See https://github.com/electron/electron/issues/19468#issuecomment-623529556 for more info.
  app.prependOnceListener("ready", onReady);
} else {
  // Otherwise create main BrowserWindow when electron is ready normally
  app.on("ready", onReady);
}

const slippiProtocol = "slippi";

const waitForMainWindow = async () => {
  let retryIdx = 0;
  while (!didFinishLoad && retryIdx < 200) {
    // It's okay to await in loop, we want things to be slow in this case
    await delay(100); // eslint-disable-line
    retryIdx += 1;
  }

  if (retryIdx >= 100) {
    throw "Timed out waiting for mainWindow to exist."; // eslint-disable-line
  }

  log.info(`Found mainWindow after ${retryIdx} tries.`);
};

const handleSlippiURIAsync = async (aUrl: string) => {
  log.info("Handling URL...");
  log.info(aUrl);

  // Check if the input is
  // Specifying a base will provide sane defaults if the input is null or wrong
  const myUrl = new url.URL(aUrl, `null://null`);
  let protocol = myUrl.protocol;
  log.info(`protocol: ${myUrl.protocol}, hostname: ${myUrl.hostname}`);
  if (myUrl.protocol !== `${slippiProtocol}:`) {
    if (await fileExists(aUrl)) {
      log.info(`File ${aUrl} exists`);
      protocol = "file:";
    } else {
      return;
    }
  }

  // When handling a Slippi request, focus the window
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  }

  switch (protocol) {
    case "slippi:": {
      let replayPath = myUrl.searchParams.get("path");
      if (!replayPath) {
        return;
      }
      // For some reason the file refuses to download if it's prefixed with "/"
      if (replayPath[0] === "/") {
        replayPath = replayPath.slice(1);
      }

      const tmpDir = app.getPath("temp");
      const destination = path.join(tmpDir, path.basename(replayPath));

      const fileAlreadyExists = await fileExists(destination);
      if (!fileAlreadyExists) {
        const dlUrl = `https://storage.googleapis.com/slippi.appspot.com/${replayPath}`;
        log.info(`Downloading file ${replayPath} to ${destination}`);
        // Dowload file
        await download(dlUrl, destination);
        log.info(`Finished download`);
      } else {
        log.info(`${destination} already exists. Skipping download...`);
      }

      // Wait until mainWindow exists so that we can send an IPC to play.
      // We are willing to wait for a few seconds before timing out
      await waitForMainWindow();
      if (mainWindow) {
        await playReplayAndShowStats(destination);
      }

      break;
    }
    case "file:": {
      log.info(myUrl.pathname);
      await waitForMainWindow();
      if (mainWindow) {
        // mainWindow.webContents.send("play-replay", aUrl);
        await playReplayAndShowStats(aUrl);
      }

      break;
    }
    default: {
      break; // Do nothing
    }
  }
};

const handleSlippiURI = (aUrl: string) => {
  // Filter out command line parameters and invalid urls
  if (aUrl.startsWith("-")) {
    return;
  }

  handleSlippiURIAsync(aUrl).catch((err) => {
    log.error("Handling URI encountered error");
    log.error(err);
  });
};

app.on("open-url", (_, aUrl) => {
  log.info(`Received open-url event: ${aUrl}`);
  handleSlippiURI(aUrl);
});

app.on("open-file", (_, aUrl) => {
  log.info(`Received open-file event: ${aUrl}`);
  handleSlippiURI(aUrl);
});

app.on("second-instance", (_, argv) => {
  log.info("Second instance detected...");
  log.info(argv);

  const lastItem = last(argv);
  if (argv.length === 1 || !lastItem) {
    return;
  }

  handleSlippiURI(lastItem);
});

const playReplayAndShowStats = async (filePath: string) => {
  await dolphinManager.launchPlaybackDolphin("playback", {
    mode: "normal",
    replay: filePath,
  });
  await ipc_statsPageRequestedEvent.main!.trigger({ filePath });
};
