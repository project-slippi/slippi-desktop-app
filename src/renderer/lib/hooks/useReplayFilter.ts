import { extractAllPlayerNames, namesMatch } from "common/matchNames";
import { FileResult } from "common/replayBrowser";
import { produce } from "immer";
import create from "zustand";

export interface FilterOptions {
  searchText: string;
  sortByNewestFirst: boolean;
  hideShortGames: boolean;
}

const initialFilterOptions: FilterOptions = {
  searchText: "",
  sortByNewestFirst: true,
  hideShortGames: true,
};

type StoreState = {
  options: FilterOptions;
};

type StoreReducers = {
  setOptions: (options: Partial<FilterOptions>) => void;
  generateFilterFunction: () => (file: FileResult) => boolean;
  generateSortFunction: () => (a: FileResult, b: FileResult) => number;
};

const initialState: StoreState = {
  options: { ...initialFilterOptions },
};

export const useReplayFilterStore = create<StoreState & StoreReducers>((set, get) => ({
  // Set the initial state
  ...initialState,

  setOptions: (options) => {
    set((store) =>
      produce(store, (draft) => {
        draft.options = Object.assign({}, draft.options, options);
      }),
    );
  },

  generateFilterFunction: () => (file: FileResult) => {
    const { options } = get();
    if (options.hideShortGames) {
      if (file.details !== null && file.details.lastFrame !== null && file.details.lastFrame <= 30 * 60) {
        return false;
      }
    }

    if (options.searchText && file.details !== null) {
      const matchable = extractAllPlayerNames(file.details.settings, file.details.metadata);
      if (matchable.length === 0) {
        return false;
      }
      return namesMatch([options.searchText], matchable);
    }
    return true;
  },

  generateSortFunction: () => (a: FileResult, b: FileResult) => {
    const { options } = get();
    const aTime = a.details?.startTime ? Date.parse(a.details.startTime) : a.header.birthtime.getTime();
    const bTime = b.details?.startTime ? Date.parse(b.details.startTime) : b.header.birthtime.getTime();
    if (options.sortByNewestFirst) {
      return bTime - aTime;
    }
    return aTime - bTime;
  },
}));

export const useReplayFilter = () => {
  const filterOptions = useReplayFilterStore((store) => store.options);
  const setFilterOptions = useReplayFilterStore((store) => store.setOptions);
  const filterFunction = useReplayFilterStore((store) => store.generateFilterFunction());
  const sortFunction = useReplayFilterStore((store) => store.generateSortFunction());

  const sortAndFilterFiles = (files: Map<string, FileResult>) => {
    return Array.from(files, ([_, value]) => value)
      .filter(filterFunction)
      .sort(sortFunction);
  };
  const clearFilter = () => {
    return setFilterOptions({ searchText: "", hideShortGames: false });
  };

  return {
    filterOptions,
    setFilterOptions,
    sortAndFilterFiles,
    clearFilter,
  };
};
