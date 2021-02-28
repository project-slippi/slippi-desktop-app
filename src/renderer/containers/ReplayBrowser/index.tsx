import Button from "@material-ui/core/Button";
import List from "@material-ui/core/List";
import { createStyles, makeStyles } from "@material-ui/core/styles";
import Tooltip from "@material-ui/core/Tooltip";
import Typography from "@material-ui/core/Typography";
import SearchIcon from "@material-ui/icons/Search";
import { colors } from "common/colors";
import { shell } from "electron";
import { debounce } from "lodash";
import React from "react";
import styled from "styled-components";

import { DualPane } from "@/components/DualPane";
import { LoadingScreen } from "@/components/LoadingScreen";
import { IconMessage } from "@/components/Message";
import { useReplayFilter } from "@/lib/hooks/useReplayFilter";
import { useReplays } from "@/store/replays";
import { useSettings } from "@/store/settings";

import { ReplayFileStats } from "../ReplayFileStats";
import { PlayerStats } from "../stats";
import { FileList } from "./FileList";
import { FilterToolbar } from "./FilterToolbar";
import { FolderTreeNode } from "./FolderTreeNode";

export const ReplayBrowser: React.FC = () => {
  const searchInputRef = React.createRef<HTMLInputElement>();
  const scrollRowItem = useReplays((store) => store.scrollRowItem);
  const setScrollRowItem = useReplays((store) => store.setScrollRowItem);
  const deleteFile = useReplays((store) => store.deleteFile);
  const files = useReplays((store) => store.files);
  const selectedItem = useReplays((store) => store.selectedFile.index);
  const selectFile = useReplays((store) => store.selectFile);
  const playFile = useReplays((store) => store.playFile);
  const clearSelectedFile = useReplays((store) => store.clearSelectedFile);
  const choosePlayer = useReplays((store) => store.initPlayer);
  const selectPlayer = (p: string) => choosePlayer(p, { characters: [], opponents: [], opponentCharacters: [] });
  const selectedPlayer = useReplays((store) => store.selectedPlayer.player);
  const clearSelectedPlayer = useReplays((store) => store.clearSelectedPlayer);
  const loading = useReplays((store) => store.loading);
  const currentFolder = useReplays((store) => store.currentFolder);
  const folders = useReplays((store) => store.folders);
  const init = useReplays((store) => store.init);
  const fileErrorCount = useReplays((store) => store.fileErrorCount);
  const rootSlpPath = useSettings((store) => store.settings.rootSlpPath);

  const { filterOptions, setFilterOptions, sortAndFilterFiles, clearFilter } = useReplayFilter();
  const filteredFiles = sortAndFilterFiles(files);
  const numHiddenFiles = files.length - filteredFiles.length;

  React.useEffect(() => {
    init(rootSlpPath);
  }, [rootSlpPath, init]);

  const setSelectedItem = (index: number | null) => {
    if (index === null) {
      clearSelectedFile();
    } else {
      const filePath = filteredFiles[index].fullPath;
      selectFile(index, filePath);
    }
  };

  const playSelectedFile = (index: number) => {
    const filePath = filteredFiles[index].fullPath;
    playFile(filePath);
  };

  const updateFilter = debounce((val) => setFilterOptions(val), 100);

  if (folders === null) {
    return null;
  }

  return (
    <Outer>
      {selectedPlayer !== null ? (
        <PlayerStats player={selectedPlayer} onClose={clearSelectedPlayer} />
      ) : selectedItem !== null ? (
        <ReplayFileStats
          index={selectedItem}
          total={filteredFiles.length}
          file={filteredFiles[selectedItem]}
          onNext={() => setSelectedItem(Math.min(filteredFiles.length - 1, selectedItem + 1))}
          onPrev={() => setSelectedItem(Math.max(0, selectedItem - 1))}
          onClose={() => setSelectedItem(null)}
        />
      ) : (
        <>
          <FilterToolbar disabled={loading} onChange={updateFilter} value={filterOptions} ref={searchInputRef} />
          <div
            style={{
              display: "flex",
              flex: "1",
              position: "relative",
              overflow: "hidden",
              borderTop: `solid 2px ${colors.grayDark}`,
            }}
          >
            <DualPane
              id="replay-browser"
              resizable={true}
              minWidth={0}
              maxWidth={300}
              leftStyle={{ backgroundColor: "rgba(0,0,0, 0.3)" }}
              leftSide={
                <List dense={true} style={{ flex: 1, padding: 0 }}>
                  <div style={{ position: "relative", minHeight: "100%" }}>
                    <FolderTreeNode {...folders} />
                    {loading && (
                      <div
                        style={{
                          position: "absolute",
                          height: "100%",
                          width: "100%",
                          top: 0,
                          backgroundColor: "rgba(0, 0, 0, 0.5)",
                        }}
                      />
                    )}
                  </div>
                </List>
              }
              rightSide={
                loading ? (
                  <LoadingBox />
                ) : filteredFiles.length === 0 ? (
                  <EmptyFolder
                    hiddenFileCount={numHiddenFiles}
                    onClearFilter={() => {
                      if (searchInputRef.current) {
                        searchInputRef.current.value = "";
                      }
                      clearFilter();
                    }}
                  />
                ) : (
                  <FileList
                    onDelete={deleteFile}
                    onSelect={(index: number) => setSelectedItem(index)}
                    onPlay={(index: number) => playSelectedFile(index)}
                    onPlayerClick={selectPlayer}
                    files={filteredFiles}
                    scrollRowItem={scrollRowItem}
                    setScrollRowItem={setScrollRowItem}
                  />
                )
              }
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              whiteSpace: "nowrap",
              padding: 5,
              backgroundColor: colors.grayDark,
              fontSize: 14,
            }}
          >
            <div>
              <Tooltip title="Open folder">
                <ReplayFolderLink onClick={() => shell.openItem(currentFolder)}>{currentFolder}</ReplayFolderLink>
              </Tooltip>
            </div>
            <div style={{ textAlign: "right" }}>
              {filteredFiles.length} files found. {numHiddenFiles} files filtered.{" "}
              {fileErrorCount > 0 ? `${fileErrorCount} files had errors.` : ""}
            </div>
          </div>
        </>
      )}
    </Outer>
  );
};

const LoadingBox: React.FC = () => {
  const progress = useReplays((store) => store.progress);
  let message =
    progress && progress.isSaving ? `Storing ${progress.total} new files, this can take a while...` : "Loading...";
  if (progress !== null) {
    message += ` ${Math.floor((progress.current / progress.total) * 100)}%`;
  }
  return <LoadingScreen message={message} />;
};

const EmptyFolder: React.FC<{
  hiddenFileCount: number;
  onClearFilter: () => void;
}> = ({ hiddenFileCount, onClearFilter }) => {
  const classes = useStyles();
  return (
    <IconMessage Icon={SearchIcon} label="No SLP files found">
      {hiddenFileCount > 0 && (
        <div style={{ textAlign: "center" }}>
          <Typography style={{ marginTop: 20, opacity: 0.6 }}>{hiddenFileCount} files hidden</Typography>
          <Button className={classes.label} color="primary" onClick={onClearFilter} size="small">
            clear filter
          </Button>
        </div>
      )}
    </IconMessage>
  );
};

const useStyles = makeStyles(() =>
  createStyles({
    label: {
      textTransform: "lowercase",
      fontSize: 12,
    },
  }),
);

const ReplayFolderLink = styled.div`
  &:hover {
    cursor: pointer;
    text-decoration: underline;
  }
`;

const Outer = styled.div`
  display: flex;
  flex-flow: column;
  flex: 1;
  position: relative;
  min-width: 0;
`;
