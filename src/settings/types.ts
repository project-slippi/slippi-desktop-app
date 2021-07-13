export interface StoredConnection {
  id: number;
  ipAddress: string;
  folderPath: string;
  isRealTimeMode: boolean;
  port?: number;
  consoleNick?: string;
  enableAutoSwitcher: boolean;
  obsIP?: string;
  obsSourceName?: string;
  obsPassword?: string;
  enableRelay: boolean;
}

export type AppSettings = {
  previousVersion?: string;
  connections: StoredConnection[];
  settings: {
    isoPath: string | null;
    slpDirs: Array<{
      path: string;
      isDefault?: boolean;
    }>;
    spectateSlpPath: string;
    netplayDolphinPath: string;
    playbackDolphinPath: string;
    launchMeleeOnPlay: boolean;
  };
};
