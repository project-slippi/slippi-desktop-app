import { FolderLoadResult, loadFolder } from "common/replayBrowser";

export async function loadReplayFolder(
  folder: string,
  callback: (current: number, total: number) => void,
): Promise<FolderLoadResult> {
  return loadFolder(folder, callback);
}
