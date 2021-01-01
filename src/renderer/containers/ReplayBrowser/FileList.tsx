import { debounce } from "lodash";
import React from "react";
import { FixedSizeList as List } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { ReplayFile } from "./ReplayFile";
import { FileResult } from "common/replayBrowser";

import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import Typography from "@material-ui/core/Typography";
import ListItemText from "@material-ui/core/ListItemText";
import { shell } from "electron";
import SearchIcon from "@material-ui/icons/Search";
import FolderIcon from "@material-ui/icons/Folder";
import DeleteIcon from "@material-ui/icons/Delete";
import { withStyles } from "@material-ui/core/styles";

const REPLAY_FILE_ITEM_SIZE = 85;

const EmptyFolder: React.FC = () => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        width: "100%",
        fontSize: 74,
      }}
    >
      <SearchIcon fontSize="inherit" />
      <Typography variant="h6" style={{ marginTop: 20 }}>
        No SLP files found
      </Typography>
    </div>
  );
};

const StyledListItemIcon = withStyles(() => ({
  root: {
    marginRight: "10px",
  },
}))(ListItemIcon);

const FileListResults: React.FC<{
  files: FileResult[];
  scrollRowItem: number;
  onOpenMenu: (index: number, element: HTMLElement) => void;
  onSelect: (index: number) => void;
  setScrollRowItem: (row: number) => void;
}> = ({ scrollRowItem, files, onSelect, onOpenMenu, setScrollRowItem }) => {
  // Keep a reference to the list so we can control the scroll position
  const listRef = React.createRef<List>();
  // Keep track of the latest scroll position
  const scrollRowRef = React.useRef(0);
  const setScrollRowRef = debounce((row: number) => {
    scrollRowRef.current = row;
  }, 100);

  const Row = React.useCallback(
    (props: { style?: React.CSSProperties; index: number }) => (
      <ReplayFile
        onOpenMenu={onOpenMenu}
        index={props.index}
        style={props.style}
        onSelect={() => onSelect(props.index)}
        {...files[props.index]}
      />
    ),
    [files, onSelect, onOpenMenu]
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
  }, [files]);

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

export const FileList: React.FC<{
  files: FileResult[];
  scrollRowItem?: number;
  setScrollRowItem: (row: number) => void;
  onDelete: (filepath: string) => void;
  onSelect: (index: number) => void;
}> = ({ scrollRowItem = 0, files, onSelect, onDelete, setScrollRowItem }) => {
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
      shell.showItemInFolder(files[menuItem.index].fullPath);
    }
    handleClose();
  };

  const handleDelete = () => {
    if (menuItem) {
      onDelete(files[menuItem.index].fullPath);
    }
    handleClose();
  };

  const handleClose = () => {
    setMenuItem(null);
  };

  return (
    <div
      style={{ display: "flex", flexFlow: "column", height: "100%", flex: "1" }}
    >
      <div style={{ flex: "1", overflow: "hidden" }}>
        {files.length > 0 ? (
          <FileListResults
            onOpenMenu={onOpenMenu}
            onSelect={onSelect}
            files={files}
            scrollRowItem={scrollRowItem}
            setScrollRowItem={setScrollRowItem}
          />
        ) : (
          <EmptyFolder />
        )}
      </div>
      <Menu
        anchorEl={menuItem ? menuItem.anchorEl : null}
        open={Boolean(menuItem)}
        onClose={handleClose}
      >
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