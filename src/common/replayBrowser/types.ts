import { GameStartType, MetadataType, StatsType } from "@slippi/slippi-js";

export interface FileResult {
  name: string;
  fullPath: string;
  settings: GameStartType;
  startTime: string | null;
  lastFrame: number | null;
  metadata: MetadataType | null;
  stats: StatsType | null;
  playerCount: number | null;
  player1: string | null;
  player2: string | null;
  player3: string | null;
  player4: string | null;
  folder: string;
}

export interface FolderResult {
  name: string;
  fullPath: string;
  subdirectories: FolderResult[];
  collapsed: boolean;
}

export interface FileLoadResult {
  files: FileResult[];
  fileErrorCount: number;
}
