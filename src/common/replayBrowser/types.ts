import { GameStartType, MetadataType } from "@slippi/slippi-js";

export interface FileResult {
  header: FileHeader;
  details: FileDetails | null;
}

export interface FileHeader {
  name: string;
  fullPath: string;
  birthtime: Date;
}

export interface FileDetails {
  settings: GameStartType;
  startTime: string | null;
  lastFrame: number | null;
  metadata: MetadataType | null;
}

export interface FolderResult {
  name: string;
  fullPath: string;
  subdirectories: FolderResult[];
  collapsed: boolean;
}

export interface FolderLoadResult {
  files: Map<string, FileHeader>;
  fileErrorCount: number;
}
