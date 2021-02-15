import { StatsType } from "@slippi/slippi-js";
import * as Comlink from "comlink";
import { FileResult, findChild, FolderResult, generateSubFolderTree } from "common/replayBrowser";
import { ipcRenderer, shell } from "electron";
import { produce, setAutoFreeze } from "immer";
import path from "path";
import create from "zustand";

import { useReplayFilterStore } from "@/lib/hooks/useReplayFilter";

import { loadReplayFiles } from "@/workers/fileLoader.worker";
import { loadReplayFolder } from "@/workers/folderLoader.worker";
import { calculateGameStats } from "@/workers/gameStats.worker";

import { useSettings } from "../settings";

// Necessary because freezing the state can errors in loadFiles.
setAutoFreeze(false);

type StoreState = {
  loading: boolean;
  progress: null | {
    current: number;
    total: number;
  };
  files: Map<string, FileResult>;
  folders: FolderResult | null;
  currentRoot: string | null;
  currentFolder: string;
  fileErrorCount: number;
  scrollRowItem: number;
  selectedFile: {
    index: number | null;
    gameStats: StatsType | null;
    loading: boolean;
    error?: any;
  };
  // Can be incremented to force ReplayBrowser to re-render. This is useful
  // because we can significantly improve performance by updating files in place
  // (without copying the map), but this will not normally trigger a render
  // because React does not recognize it as a state change.
  forceRender: number;
};

type StoreReducers = {
  init: (rootFolder: string, forceReload?: boolean, currentFolder?: string) => Promise<void>;
  selectFile: (index: number, filePath: string) => Promise<void>;
  playFile: (filePath: string) => Promise<void>;
  clearSelectedFile: () => Promise<void>;
  deleteFile: (filePath: string) => Promise<void>;
  loadDirectoryList: (folder: string) => Promise<void>;
  loadFolder: (childPath?: string, forceReload?: boolean) => Promise<void>;
  loadFiles: (results: Map<string, FileResult>) => void;
  toggleFolder: (fullPath: string) => void;
  setScrollRowItem: (offset: number) => void;
};

const initialState: StoreState = {
  loading: false,
  progress: null,
  files: new Map(),
  folders: null,
  currentRoot: null,
  currentFolder: useSettings.getState().settings.rootSlpPath,
  fileErrorCount: 0,
  scrollRowItem: 0,
  selectedFile: {
    index: null,
    gameStats: null,
    error: null,
    loading: false,
  },
  forceRender: 0,
};

export const useReplays = create<StoreState & StoreReducers>((set, get) => ({
  // Set the initial state
  ...initialState,

  init: async (rootFolder, forceReload, currentFolder) => {
    const { currentRoot, loadFolder, loadDirectoryList } = get();
    if (currentRoot === rootFolder && !forceReload) {
      return;
    }

    set({
      currentRoot: rootFolder,
      folders: {
        name: path.basename(rootFolder),
        fullPath: rootFolder,
        subdirectories: [],
        collapsed: false,
      },
    });

    await Promise.all([loadDirectoryList(currentFolder ?? rootFolder), loadFolder(currentFolder ?? rootFolder, true)]);
  },

  playFile: async (fullPath) => {
    ipcRenderer.send("viewReplay", fullPath);
  },

  selectFile: async (index, fullPath) => {
    if (get().selectedFile.loading) {
      console.warn("Alreading loading game stats for another file. Try again later.");
      return;
    }

    set({
      selectedFile: { index, gameStats: null, loading: true, error: null },
    });
    const { selectedFile } = get();
    const newSelectedFile = await produce(selectedFile, async (draft) => {
      try {
        const gameStats = await calculateGameStats(fullPath);
        draft.gameStats = gameStats;
      } catch (err) {
        draft.error = err;
      } finally {
        draft.loading = false;
      }
    });
    set({ selectedFile: newSelectedFile });
  },

  clearSelectedFile: async () => {
    set({
      selectedFile: {
        index: null,
        gameStats: null,
        error: null,
        loading: false,
      },
    });
  },

  deleteFile: async (filePath: string) => {
    set((state) =>
      produce(state, (draft) => {
        if (!draft.files.has(filePath)) {
          console.warn(`Could not find ${filePath} in file list`);
          return;
        }

        const success = shell.moveItemToTrash(filePath);
        if (success) {
          draft.files.delete(filePath);
        } else {
          console.warn(`Failed to delete ${filePath}`);
        }
      }),
    );
  },

  loadFolder: async (childPath, forceReload) => {
    const { currentFolder, loading, loadFiles } = get();

    if (loading) {
      console.warn("A folder is already loading! Please wait for it to finish first.");
      return;
    }

    const folderToLoad = childPath ?? currentFolder;
    if (currentFolder === folderToLoad && !forceReload) {
      console.warn(`${currentFolder} is already loaded. Set forceReload to true to reload anyway.`);
      return;
    }

    set({ currentFolder: folderToLoad });

    set({ loading: true, progress: null });
    try {
      const result = await loadReplayFolder(
        folderToLoad,
        Comlink.proxy((current, total) => {
          set({ progress: { current, total } });
        }),
      );
      const results = new Map(Array.from(result.files, ([path, header]) => [path, { header: header, details: null }]));
      set({
        scrollRowItem: 0,
        files: results,
        loading: false,
        fileErrorCount: result.fileErrorCount,
      });
      loadFiles(results);
    } catch (err) {
      console.warn(err);
      set({ loading: false, progress: null });
    }
  },

  loadFiles: async (results: Map<string, FileResult>) => {
    const thisFolder = get().currentFolder;

    // Subset of StoreState that is allowed to be modified in this function.
    type LoadFilesState = {
      files: Map<string, FileResult>;
      fileErrorCount: number;
    };

    // Every time we update files causes an expensive rerender, and React will
    // not batch state changes that are made in the callback. Therefore we batch
    // state changes manually.
    const batcher = (() => {
      // This parameter balances the responsiveness of the replays list versus the
      // total loading time. A smaller value will update the list more frequency,
      // but will delay further loads while the list is re-rendered.
      const UPDATE_BATCH_SIZE = 400;

      // Making the first batch smaller improves the perceived responsiveness.
      // This value is chosen to be slightly larger than the likely first page
      // size.
      const FIRST_BATCH_SIZE = 20;

      const indexState = get();
      const state: LoadFilesState = { files: indexState.files, fileErrorCount: indexState.fileErrorCount };

      let batchSize = UPDATE_BATCH_SIZE - FIRST_BATCH_SIZE;

      const flush = () => {
        // The current folder may change while we are loading files. If it does
        // so, ignore state changes.
        if (get().currentFolder == thisFolder) {
          set((oldState) => ({ ...state, forceRender: oldState.forceRender + 1 }));
          batchSize = 0;
        }
      };

      const setState = (updateFn: (state: LoadFilesState) => Partial<LoadFilesState>) => {
        Object.assign(state, updateFn(state));
        batchSize++;
        if (batchSize >= UPDATE_BATCH_SIZE) {
          flush();
        }
      };

      return {
        setState: setState,
        flush: flush,
      };
    })();

    // Sort headers so files will load in approximately display order (nothing
    // will be filtered at this point since details are empty).
    const sortedHeaders = Array.from(results, ([_, result]) => result)
      .sort(useReplayFilterStore.getState().generateSortFunction())
      .map((result) => result.header);

    let callbackCount = 0;
    const newFiles = new Map(results);
    await loadReplayFiles(
      sortedHeaders,
      Comlink.proxy((path, details) => {
        if (!newFiles.has(path)) {
          console.error("File misssing (this should not happen).");
        } else {
          newFiles.get(path)!.details = details;
          batcher.setState((_) => ({ files: newFiles }));
        }
        callbackCount++;
        if (callbackCount == sortedHeaders.length) {
          batcher.flush();
        }
      }),
      Comlink.proxy((path, err) => {
        if (!newFiles.has(path)) {
          console.error("File misssing (this should not happen).");
        } else {
          newFiles.delete(path);
          console.warn(err);
          batcher.setState((state) => ({
            fileErrorCount: state.fileErrorCount + 1,
            files: newFiles,
          }));
        }
        callbackCount++;
        if (callbackCount == sortedHeaders.length) {
          batcher.flush();
        }
      }),
      Comlink.proxy(() => {
        return get().currentFolder != thisFolder;
      }),
    );
  },

  toggleFolder: (folder) => {
    set((state) =>
      produce(state, (draft) => {
        const currentTree = draft.folders;
        if (currentTree) {
          const child = findChild(currentTree, folder);
          if (child) {
            child.collapsed = !child.collapsed;
          }
        }
      }),
    );
  },

  loadDirectoryList: async (folder?: string) => {
    const { currentRoot, folders } = get();
    const rootSlpPath = useSettings.getState().settings.rootSlpPath;

    let currentTree = folders;
    if (currentTree === null || currentRoot !== rootSlpPath) {
      currentTree = {
        name: path.basename(rootSlpPath),
        fullPath: rootSlpPath,
        subdirectories: [],
        collapsed: false,
      };
    }

    const newFolders = await produce(currentTree, async (draft: FolderResult) => {
      const pathToLoad = folder ?? rootSlpPath;
      const child = findChild(draft, pathToLoad) ?? draft;
      const childPaths = path.relative(child.fullPath, pathToLoad);
      const childrenToExpand = childPaths ? childPaths.split(path.sep) : [];
      if (child && child.subdirectories.length === 0) {
        child.subdirectories = await generateSubFolderTree(child.fullPath, childrenToExpand);
      }
    });

    set({ folders: newFolders });
  },

  setScrollRowItem: (rowItem) => {
    set({ scrollRowItem: rowItem });
  },
}));
