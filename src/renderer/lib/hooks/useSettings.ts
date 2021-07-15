import { DolphinLaunchType } from "@dolphin/types";
import {
  ipc_setIsoPath,
  ipc_setLaunchMeleeOnPlay,
  ipc_setNetplayDolphinPath,
  ipc_setPlaybackDolphinPath,
  ipc_setSlpDirs,
  ipc_setSpectateSlpPath,
} from "@settings/ipc";
import { AppSettings } from "@settings/types";
import { ipcRenderer } from "electron";
import create from "zustand";
import { combine } from "zustand/middleware";

const initialState = ipcRenderer.sendSync("getAppSettingsSync") as AppSettings;
console.log("initial state: ", initialState);

export const useSettings = create(
  combine(
    {
      ...initialState,
    },
    (set) => ({
      updateSettings: (settings: AppSettings) => set(() => settings),
    }),
  ),
);

export const useIsoPath = () => {
  const isoPath = useSettings((store) => store.settings.isoPath);
  const setPath = async (isoPath: string | null) => {
    const setResult = await ipc_setIsoPath.renderer!.trigger({ isoPath });
    if (!setResult.result) {
      throw new Error("Error setting ISO path");
    }
  };
  return [isoPath, setPath] as const;
};

export const useSlpDirs = () => {
  const rootSlpPath = useSettings((store) => store.settings.slpDirs);
  const setSlpReplayDirs = async (
    dirs: {
      path: string;
      isDefault?: boolean | undefined;
    }[],
  ) => {
    const setResult = await ipc_setSlpDirs.renderer!.trigger({ dirs });
    if (!setResult.result) {
      throw new Error("Error setting root SLP paths");
    }
  };
  return [rootSlpPath, setSlpReplayDirs] as const;
};

export const useSpectateSlpPath = () => {
  const spectateSlpPath = useSettings((store) => store.settings.spectateSlpPath);
  const setSpectateDir = async (path: string) => {
    const setResult = await ipc_setSpectateSlpPath.renderer!.trigger({ path });
    if (!setResult.result) {
      throw new Error("Error setting spectate SLP path");
    }
  };
  return [spectateSlpPath, setSpectateDir] as const;
};

export const useDolphinPath = (dolphinType: DolphinLaunchType) => {
  const netplayDolphinPath = useSettings((store) => store.settings.netplayDolphinPath);
  const setNetplayPath = async (path: string) => {
    const setResult = await ipc_setNetplayDolphinPath.renderer!.trigger({ path });
    if (!setResult.result) {
      throw new Error("Error setting netplay dolphin path");
    }
  };

  const playbackDolphinPath = useSettings((store) => store.settings.playbackDolphinPath);
  const setDolphinPath = async (path: string) => {
    const setResult = await ipc_setPlaybackDolphinPath.renderer!.trigger({ path });
    if (!setResult.result) {
      throw new Error("Error setting playback dolphin path");
    }
  };

  switch (dolphinType) {
    case DolphinLaunchType.NETPLAY: {
      return [netplayDolphinPath, setNetplayPath] as const;
    }
    case DolphinLaunchType.PLAYBACK: {
      return [playbackDolphinPath, setDolphinPath] as const;
    }
  }
};

export const useLaunchMeleeOnPlay = () => {
  const launchMeleeOnPlay = useSettings((store) => store.settings.launchMeleeOnPlay);
  const setLaunchMelee = async (launchMelee: boolean) => {
    const setResult = await ipc_setLaunchMeleeOnPlay.renderer!.trigger({ launchMelee });
    if (!setResult.result) {
      throw new Error("Error setting launch melee on Play");
    }
  };

  return [launchMeleeOnPlay, setLaunchMelee] as const;
};
