import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import { withStyles } from "@material-ui/core/styles";
import DeleteIcon from "@material-ui/icons/Delete";
import FolderIcon from "@material-ui/icons/Folder";
import { FileResult } from "common/replayBrowser";
import { shell } from "electron";
import { debounce } from "lodash";
import React from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList as List } from "react-window";

import { ErrorBoundary } from "@/components/ErrorBoundary";

import { ReplayFile } from "./ReplayFile";

const REPLAY_FILE_ITEM_SIZE = 85;

const StyledListItemIcon = withStyles(() => ({
  root: {
    marginRight: "10px",
  },
}))(ListItemIcon);

// This is the container for all the replays visible, the autosizer will handle the virtualization portion
const FileListResults: React.FC<{
  currentFolder: string;
  files: FileResult[];
  scrollRowItem: number;
  onOpenMenu: (index: number, element: HTMLElement) => void;
  onSelect: (index: number) => void;
  onPlay: (index: number) => void;
  setScrollRowItem: (row: number) => void;
}> = ({ currentFolder, files, scrollRowItem, onOpenMenu, onSelect, onPlay, setScrollRowItem }) => {
  // Keep a reference to the list so we can control the scroll position
  const listRef = React.createRef<List>();
  // Keep track of the latest scroll position
  const scrollRowRef = React.useRef(0);
  const setScrollRowRef = debounce((row: number) => {
    scrollRowRef.current = row;
  }, 100);

  const Row = React.useCallback(
    (props: { style?: React.CSSProperties; index: number }) => (
      <ErrorBoundary>
        <ReplayFile
          onOpenMenu={onOpenMenu}
          index={props.index}
          style={props.style}
          onSelect={() => onSelect(props.index)}
          onPlay={() => onPlay(props.index)}
          {...files[props.index]}
        />
      </ErrorBoundary>
    ),
    [files, onSelect, onPlay, onOpenMenu],
  );

  // Store the latest scroll row item on unmount
  React.useEffect(() => {
    return () => {
      setScrollRowItem(scrollRowRef.current);
    };
  }, []);

  // Rest scroll position whenever the files change
  React.useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollToItem(0);
    }
  }, [currentFolder]);

  return (
    <AutoSizer>
      {({ height, width }) => (
        <List
          ref={listRef}
          height={height}
          width={width}
          initialScrollOffset={scrollRowItem * REPLAY_FILE_ITEM_SIZE}
          itemCount={files.length}
          itemSize={REPLAY_FILE_ITEM_SIZE}
          onItemsRendered={({ visibleStartIndex }) => {
            setScrollRowRef(visibleStartIndex);
          }}
        >
          {Row}
        </List>
      )}
    </AutoSizer>
  );
};

// the container containing FileListResults. figure the rest out yourself
// to simplify the DOM, the submenu for each row is essentially the same until you actually click on it for a given row.
export const FileList: React.FC<{
  currentFolder: string;
  files: FileResult[];
  scrollRowItem?: number;
  setScrollRowItem: (row: number) => void;
  onDelete: (filepath: string) => void;
  onSelect: (index: number) => void;
  onPlay: (index: number) => void;
}> = ({ currentFolder, files, scrollRowItem = 0, setScrollRowItem, onDelete, onSelect, onPlay }) => {
  const [menuItem, setMenuItem] = React.useState<null | {
    index: number;
    anchorEl: HTMLElement;
  }>(null);

  const onOpenMenu = React.useCallback((index: number, target: any) => {
    setMenuItem({
      index,
      anchorEl: target,
    });
  }, []);

  const handleRevealLocation = () => {
    if (menuItem) {
      shell.showItemInFolder(files[menuItem.index].header.fullPath);
    }
    handleClose();
  };

  const handleDelete = () => {
    if (menuItem) {
      onDelete(files[menuItem.index].header.fullPath);
    }
    handleClose();
  };

  const handleClose = () => {
    setMenuItem(null);
  };

  return (
    <div style={{ display: "flex", flexFlow: "column", height: "100%", flex: "1" }}>
      <div style={{ flex: "1", overflow: "hidden" }}>
        <FileListResults
          onOpenMenu={onOpenMenu}
          onSelect={onSelect}
          onPlay={onPlay}
          currentFolder={currentFolder}
          files={files}
          scrollRowItem={scrollRowItem}
          setScrollRowItem={setScrollRowItem}
        />
      </div>
      <Menu anchorEl={menuItem ? menuItem.anchorEl : null} open={Boolean(menuItem)} onClose={handleClose}>
        <MenuItem onClick={handleRevealLocation}>
          <StyledListItemIcon>
            <FolderIcon fontSize="small" />
          </StyledListItemIcon>
          <ListItemText primary="Reveal location" />
        </MenuItem>
        <MenuItem onClick={handleDelete}>
          <StyledListItemIcon>
            <DeleteIcon fontSize="small" />
          </StyledListItemIcon>
          <ListItemText primary="Delete" />
        </MenuItem>
      </Menu>
    </div>
  );
};
