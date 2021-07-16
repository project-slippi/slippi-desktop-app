/** @jsx jsx */
import { css, jsx } from "@emotion/react";
import styled from "@emotion/styled";
import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";
import List from "@material-ui/core/List";
import Tooltip from "@material-ui/core/Tooltip";
import Typography from "@material-ui/core/Typography";
import FolderIcon from "@material-ui/icons/Folder";
import SearchIcon from "@material-ui/icons/Search";
import FileIcon from "../../../../static/images/file.png";
import { colors } from "common/colors";
import { shell } from "electron";
import React from "react";
import { useToasts } from "react-toast-notifications";

import { DualPane } from "@/components/DualPane";
import { BasicFooter } from "@/components/Footer";
import { LabelledText } from "@/components/LabelledText";
import { LoadingScreen } from "@/components/LoadingScreen";
import { IconMessage } from "@/components/Message";
import { usePlayFiles } from "@/lib/hooks/usePlayFiles";
import { useReplayBrowserList, useReplayBrowserNavigation } from "@/lib/hooks/useReplayBrowserList";
import { useReplayFilter } from "@/lib/hooks/useReplayFilter";
import { useReplays, useReplaySelection } from "@/lib/hooks/useReplays";
import { useSettings } from "@/lib/hooks/useSettings";

import { FileList } from "./FileList";
import { FileSelectionToolbar } from "./FileSelectionToolbar";
import { FilterToolbar } from "./FilterToolbar";
import { FolderTreeNode } from "./FolderTreeNode";

export const ReplayBrowser: React.FC = () => {
  const searchInputRef = React.createRef<HTMLInputElement>();
  const scrollRowItem = useReplays((store) => store.scrollRowItem);
  const setScrollRowItem = useReplays((store) => store.setScrollRowItem);
  const removeFile = useReplays((store) => store.removeFile);
  const selectFile = useReplays((store) => store.selectFile);
  const playFiles = usePlayFiles();
  const clearSelectedFile = useReplays((store) => store.clearSelectedFile);
  const loading = useReplays((store) => store.loading);
  const currentFolder = useReplays((store) => store.currentFolder);
  const folders = useReplays((store) => store.folders);
  const selectedFiles = useReplays((store) => store.selectedFiles);
  const fileSelection = useReplaySelection();
  const init = useReplays((store) => store.init);
  const fileErrorCount = useReplays((store) => store.fileErrorCount);
  const rootSlpPath = useSettings((store) => store.settings.rootSlpPath);
  const { addToast } = useToasts();

  const resetFilter = useReplayFilter((store) => store.resetFilter);
  const { files: filteredFiles, hiddenFileCount } = useReplayBrowserList();
  const { goToReplayStatsPage } = useReplayBrowserNavigation();

  React.useEffect(() => {
    init(rootSlpPath).catch((err) => addToast(err.message, { appearance: "error" }));
  }, [rootSlpPath, init, addToast]);

  const setSelectedItem = (index: number | null) => {
    if (index === null) {
      void clearSelectedFile();
    } else {
      const file = filteredFiles[index];
      void selectFile(file, index, filteredFiles.length);
      goToReplayStatsPage(file.fullPath);
    }
  };

  const playSelectedFile = (index: number) => {
    const filePath = filteredFiles[index].fullPath;
    playFiles([{ path: filePath }]);
  };

  const deleteFiles = (filePaths: string[]) => {
    let errCount = 0;
    filePaths.forEach((filePath) => {
      const success = shell.moveItemToTrash(filePath);
      if (success) {
        // Remove the file from the store
        removeFile(filePath);
      } else {
        errCount += 1;
      }
    });

    let message = `${filePaths.length - errCount} file(s) deleted successfully.`;
    if (errCount > 0) {
      message += ` ${errCount} file(s) couldn't be deleted.`;
    }
    addToast(message, { appearance: "success", autoDismiss: true });
  };

  if (folders === null) {
    return null;
  }

  return (
    <Outer>
      <div
        style={{
          display: "flex",
          flex: "1",
          position: "relative",
          overflow: "hidden",
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
            <div
              css={css`
                display: flex;
                flex-direction: column;
                flex: 1;
              `}
            >
              <FilterToolbar disabled={loading} ref={searchInputRef} />
              {loading ? (
                <LoadingBox />
              ) : filteredFiles.length === 0 ? (
                <EmptyFolder
                  hiddenFileCount={hiddenFileCount}
                  onClearFilter={() => {
                    if (searchInputRef.current) {
                      searchInputRef.current.value = "";
                    }
                    resetFilter();
                  }}
                />
              ) : (
                <FileList
                  folderPath={currentFolder}
                  onDelete={(filePath) => deleteFiles([filePath])}
                  onFileClick={fileSelection.onFileClick}
                  selectedFiles={selectedFiles}
                  onSelect={(index: number) => setSelectedItem(index)}
                  onPlay={(index: number) => playSelectedFile(index)}
                  files={filteredFiles}
                  scrollRowItem={scrollRowItem}
                  setScrollRowItem={setScrollRowItem}
                />
              )}
              <FileSelectionToolbar
                totalSelected={selectedFiles.length}
                onSelectAll={fileSelection.selectAll}
                onPlay={() => playFiles(selectedFiles.map((path) => ({ path })))}
                onClear={fileSelection.clearSelection}
                onDelete={() => {
                  deleteFiles(selectedFiles);
                  fileSelection.clearSelection();
                }}
              />
            </div>
          }
        />
      </div>

      <div
        id={"dragCountGrandParent"}
        style={{
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          id={"dragCountParent"}
          style={{
            display: "inline-block",
            border: "0px solid red",
            position: "absolute",
          }}
        >
          <img src={FileIcon} />
          <div
            style={{
              color: "white",
              background: "red",
              fontSize: "15px",
              display: "inline-block",
              borderRadius: "11px",
              paddingLeft: "4.77px" /* derived from π lol */,
              paddingRight: "4.77px",
              marginRight: "5px",
              marginTop: "1px",
              position: "absolute",
              right: 0,
              top: 0,
            }}
            id={"dragCount"}
          >
            7124
          </div>
        </div>
      </div>

      <Footer>
        <div
          css={css`
            display: flex;
            align-items: center;
          `}
        >
          <div>
            <Tooltip title="Reveal location">
              <IconButton onClick={() => shell.openItem(currentFolder)} size="small">
                <FolderIcon
                  css={css`
                    color: ${colors.purpleLight};
                  `}
                />
              </IconButton>
            </Tooltip>
          </div>
          <LabelledText
            label="Current folder"
            css={css`
              margin-left: 10px;
            `}
          >
            {currentFolder}
          </LabelledText>
        </div>
        <div style={{ textAlign: "right" }}>
          {filteredFiles.length} files found. {hiddenFileCount} files filtered.{" "}
          {fileErrorCount > 0 ? `${fileErrorCount} files had errors.` : ""}
        </div>
      </Footer>
    </Outer>
  );
};

const LoadingBox: React.FC = () => {
  const progress = useReplays((store) => store.progress);
  let message = "Loading...";
  if (progress !== null) {
    message += ` ${Math.floor((progress.current / progress.total) * 100)}%`;
  }
  return <LoadingScreen message={message} />;
};

const EmptyFolder: React.FC<{
  hiddenFileCount: number;
  onClearFilter: () => void;
}> = ({ hiddenFileCount, onClearFilter }) => {
  return (
    <IconMessage Icon={SearchIcon} label="No SLP files found">
      {hiddenFileCount > 0 && (
        <div style={{ textAlign: "center" }}>
          <Typography style={{ marginTop: 20, opacity: 0.6 }}>{hiddenFileCount} files hidden</Typography>
          <Button
            css={css`
              text-transform: lowercase;
              font-size: 12px;
            `}
            color="primary"
            onClick={onClearFilter}
            size="small"
          >
            clear filter
          </Button>
        </div>
      )}
    </IconMessage>
  );
};

const Outer = styled.div`
  display: flex;
  flex-flow: column;
  flex: 1;
  position: relative;
  min-width: 0;
`;

const Footer = styled(BasicFooter)`
  justify-content: space-between;
`;
