import { FolderResult } from "@replays/types";
import * as fs from "fs-extra";
import path from "path";

export function findChild(tree: FolderResult, childToFind: string): FolderResult | null {
  const relativePath = path.relative(tree.fullPath, childToFind);
  if (!relativePath) {
    return tree;
  }
  const pathMap = relativePath.split(path.sep);
  if (pathMap.length > 0) {
    const nextChild = tree.subdirectories.find((dir) => dir.name === pathMap[0]);
    if (nextChild) {
      return findChild(nextChild, childToFind);
    }
  }
  return null;
}

/**
 * Returns the tree structure of a folder
 * @param folder Details including name, and subdirectories
 * @param childrenToExpand The name of the subdirectories to expand.
 */
export async function generateSubFolderTree(folder: string, childrenToExpand?: string[]): Promise<FolderResult[]> {
  console.log(`generating subfolder tree for folder: ${folder} with children: ${childrenToExpand}`);
  // Only generate the tree for a single level
  const results = await fs.readdir(folder, { withFileTypes: true });
  const subdirectories = results
    .filter((dirent) => {
      return dirent.isDirectory();
    })
    .map(
      async (dirent): Promise<FolderResult> => {
        const fullPath = path.join(folder, dirent.name);
        let subdirs: FolderResult[] = [];
        if (childrenToExpand && childrenToExpand.length > 0 && childrenToExpand[0] === dirent.name) {
          subdirs = await generateSubFolderTree(fullPath, childrenToExpand.slice(1));
        }

        return {
          name: dirent.name,
          fullPath,
          subdirectories: subdirs,
          collapsed: false,
        };
      },
    );

  return Promise.all(subdirectories);
}
