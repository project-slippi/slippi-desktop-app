import * as fs from "fs-extra";
import path from "path";

import { deleteReplays, getFolderFiles, getFolderReplays, saveReplays } from "./dao";
import { parseReplays } from "./statsComputer";
import { FileLoadResult } from "./types";

const filterReplays = async (folder: string) => {
  const loadedFiles = await getFolderFiles(folder);
  const dirfiles = await fs.readdir(folder, { withFileTypes: true });
  const slpFiles = dirfiles
    .filter((dirent) => dirent.isFile() && path.extname(dirent.name) === ".slp")
    .map((d) => path.resolve(folder, d.name));

  const toLoad = slpFiles.filter((file) => !loadedFiles.includes(file));
  const toDelete = loadedFiles.filter((file) => !slpFiles.includes(file));

  console.log({ loadedFiles });
  console.log({ total: slpFiles.length, toLoad, toDelete });
  return { total: slpFiles.length, toLoad, toDelete };
};

export async function loadFolder(
  folder: string,
  callback: (current: number, total: number) => void,
): Promise<FileLoadResult> {
  // If the folder does not exist, return empty
  if (!(await fs.pathExists(folder))) {
    return {
      files: [],
      fileErrorCount: 0,
    };
  }

  const { total, toLoad, toDelete } = await filterReplays(folder);
  console.log(`found ${total} files in ${folder}, ${total} are new. ${toDelete.length} will be removed from the DB`);

  if (toDelete.length > 0) {
    console.log(toDelete);
    await deleteReplays(toDelete);
    console.log(`deleted ${toDelete.length} replays from the db`);
  }
  let fileErrorCount = 0;
  if (toLoad.length > 0) {
    const parsed = await parseReplays(toLoad, (count) => callback(count, toLoad.length));
    fileErrorCount = toLoad.length - parsed.length;
    await saveReplays(parsed);
  }

  const files = await getFolderReplays(folder);
  console.log(`loaded ${files.length} replays in ${folder} from the db`);

  return { files, fileErrorCount };
}
