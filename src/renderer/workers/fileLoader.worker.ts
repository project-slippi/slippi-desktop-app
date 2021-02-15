import { FileDetails, FileHeader, loadFiles } from "common/replayBrowser";

export async function loadReplayFiles(
  fileHeaders: FileHeader[],
  callback: (path: string, details: FileDetails) => void,
  errorCallback: (path: string, err: Error) => void,
  shouldCancel: () => boolean,
): Promise<void> {
  return loadFiles(fileHeaders, callback, errorCallback, shouldCancel);
}
