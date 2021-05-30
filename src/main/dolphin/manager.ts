import { DolphinLaunchType, findDolphinExecutable } from "common/dolphin";
import log from "electron-log";
import electronSettings from "electron-settings";
import { EventEmitter } from "events";

import { downloadAndInstallDolphin } from "../downloadDolphin";
import { DolphinInstance, PlaybackDolphinInstance } from "./instance";
import { ReplayCommunication } from "./types";

electronSettings.configure({
  fileName: "Settings",
  prettify: true,
});

// DolphinManager should be in control of all dolphin instances that get opened for actual use.
// This includes playing netplay, viewing replays, watching broadcasts (spectating), and configuring Dolphin.
export class DolphinManager extends EventEmitter {
  private playbackDolphinInstances = new Map<string, PlaybackDolphinInstance>();
  private netplayDolphinInstance: DolphinInstance | null = null;

  public async launchPlaybackDolphin(id: string, replayComm: ReplayCommunication): Promise<void> {
    const dolphinPath = await findDolphinExecutable(DolphinLaunchType.PLAYBACK);
    const meleeISOPath = (await electronSettings.get("settings.isoPath")) as string | undefined;

    const configuring = this.playbackDolphinInstances.get("configure");
    if (configuring) {
      log.warn("cannot open dolphin if a configuring dolphin is open");
    }
    let playbackInstance = this.playbackDolphinInstances.get(id);
    if (!playbackInstance) {
      playbackInstance = new PlaybackDolphinInstance(dolphinPath, meleeISOPath);
      playbackInstance.on("close", () => {
        this.emit("dolphin-closed", id);

        // Remove the instance from the map on close
        this.playbackDolphinInstances.delete(id);
      });
      this.playbackDolphinInstances.set(id, playbackInstance);
    }

    playbackInstance.play(replayComm);
  }

  public async launchNetplayDolphin() {
    const dolphinPath = await findDolphinExecutable(DolphinLaunchType.NETPLAY);
    const meleeISOPath = (await electronSettings.get("settings.isoPath")) as string | undefined;
    if (!this.netplayDolphinInstance) {
      this.netplayDolphinInstance = new DolphinInstance(dolphinPath, meleeISOPath);
      this.netplayDolphinInstance.on("close", () => {
        this.netplayDolphinInstance = null;
      });
    } else {
      log.warn("cannot open netplay dolphin twice");
    }
  }

  public async configureDolphin(launchType: DolphinLaunchType) {
    const dolphinPath = await findDolphinExecutable(launchType);
    if (launchType === DolphinLaunchType.NETPLAY && !this.netplayDolphinInstance) {
      const instance = new DolphinInstance(dolphinPath);
      this.netplayDolphinInstance = instance;
      this.netplayDolphinInstance.on("close", () => {
        this.netplayDolphinInstance = null;
      });
      instance.start();
    } else if (launchType === DolphinLaunchType.PLAYBACK && this.playbackDolphinInstances.size === 0) {
      const instance = new PlaybackDolphinInstance(dolphinPath);
      this.playbackDolphinInstances.set("configure", instance);
      instance.on("close", () => {
        this.emit("dolphin-closed", "configure");

        // Remove the instance from the map on close
        this.playbackDolphinInstances.delete("configure");
      });
      instance.start();
    }
  }

  public async reinstallDolphin(launchType: DolphinLaunchType) {
    switch (launchType) {
      case DolphinLaunchType.NETPLAY: {
        if (this.netplayDolphinInstance !== null) {
          log.warn("A netplay dolphin is open");
          return;
        }
        break;
      }
      case DolphinLaunchType.PLAYBACK: {
        if (this.playbackDolphinInstances.size > 0) {
          log.warn("A playback dolphin is open");
          return;
        }
        break;
      }
    }
    // No dolphins of launchType are open so lets reinstall
    downloadAndInstallDolphin(launchType, log.info, true);
  }
}

export const dolphinManager = new DolphinManager();
