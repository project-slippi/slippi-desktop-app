import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { stages as stageUtils, characters as characterUtils } from '@slippi/slippi-js';
import {
  Table,
  Icon,
  Header,
  Button,
  Input,
  Dropdown,
  Form,
  Segment,
  Message,
  Loader,
  Visibility,
} from 'semantic-ui-react';
import styles from './FileLoader.scss';
import FileRow from './FileRow';
import DismissibleMessage from './common/DismissibleMessage';
import PageHeader from './common/PageHeader';
import FolderBrowser from './common/FolderBrowser';
import PageWrapper from './PageWrapper';
import Scroller from './common/Scroller';
import { MIN_GAME_LENGTH_SECONDS } from '../actions/fileLoader';

const GAME_BATCH_SIZE = 50;

export default class FileLoader extends Component {
  static propTypes = {
    // fileLoader actions
    loadRootFolder: PropTypes.func.isRequired,
    changeFolderSelection: PropTypes.func.isRequired,
    playFile: PropTypes.func.isRequired,
    queueFiles: PropTypes.func.isRequired,
    storeScrollPosition: PropTypes.func.isRequired,
    storeFileLoadState: PropTypes.func.isRequired,
    setStatsGamePage: PropTypes.func.isRequired,
    deleteSelections: PropTypes.func.isRequired,
    setFilterReplays: PropTypes.func.isRequired,
    
    // error actions
    dismissError: PropTypes.func.isRequired,

    // store data
    history: PropTypes.object.isRequired,
    store: PropTypes.object.isRequired,
    errors: PropTypes.object.isRequired,
    topNotifOffset: PropTypes.number.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      selections: [],
    };
  }

  componentDidMount() {
    if (this.props.history.action === "PUSH") {
      // The action when returning from the stats page is "POP". The action when coming from the
      // main menu is "PUSH". When coming from the main menu, we want to reload the files such that
      // any new files show up correctly
      this.props.setFilterReplays(true);
      this.props.loadRootFolder();

      // Arriving at the file browser from the top level menu should reset the scroll position because
      // the files may be different than when we last looked.
      this.props.storeScrollPosition({
        x: 0,
        y: 0,
      });
    } else if (this.props.history.action === "POP") {
      const xPos = _.get(this.props.store, ['scrollPosition', 'x']) || 0;
      const yPos = _.get(this.props.store, ['scrollPosition', 'y']) || 0;

      this.refTableScroll.scrollTo(xPos, yPos);
    }
  }

  componentDidUpdate(prevProps) {
    const filesHaveLoaded = _.get(this.props, ['store', 'fileLoadState', 'hasLoaded'], false);
    const prevFilesHaveLoaded = _.get(prevProps, ['store', 'fileLoadState', 'hasLoaded'], false);

    if (!prevFilesHaveLoaded && filesHaveLoaded) {
      const xPos = _.get(this.props.store, ['scrollPosition', 'x']) || 0;
      const yPos = _.get(this.props.store, ['scrollPosition', 'y']) || 0;

      this.refTableScroll.scrollTo(xPos, yPos);

      // Clear scroll position so that if we browse to a different folder it doesn't try to restore
      // the position that was saved on the current folder
      this.props.storeScrollPosition({
        x: 0,
        y: 0,
      });
    }
  }

  componentWillUnmount() {
    this.props.storeScrollPosition({
      x: this.refTableScroll.scrollLeft,
      y: this.refTableScroll.scrollTop,
    });

    this.props.dismissError('fileLoader-global');
  }

  refTableScroll = null;

  setTableScrollRef = element => {
    this.refTableScroll = element;
  };

  onSelect = selectedFile => {
    const newSelections = [];

    let wasSeen = false;
    this.state.selections.forEach(file => {
      if (file === selectedFile) {
        wasSeen = true;
        return;
      }
      newSelections.push(file);
    });
    if (!wasSeen) {
      newSelections.push(selectedFile);
    }

    this.setState({
      selections: newSelections,
    });
  };

  renderSidebar() {
    const store = this.props.store || {};

    // Have to offset both the height and sticky position of the sidebar when a global notif is
    // active. Wish I knew a better way to do this.
    const customStyling = {
      height: `calc(100vh - ${this.props.topNotifOffset}px)`,
    };

    // We return a div that will serve as a placeholder for our column as well as a fixed
    // div for actually displaying the sidebar
    // TODO: I'm not really sure why I had to subtract 85 from top offset in this case and
    // TODO: the other places didn't have to. But without that there was 85 pixels of blank space
    // TODO: at the bottom
    return [
      <div key="column-placeholder" />,
      <div key="sidebar" style={customStyling} className={styles['sidebar']}>
        <Scroller topOffset={this.props.topNotifOffset - 85}>
          <FolderBrowser
            folders={store.folders}
            rootFolderName={store.rootFolderName}
            selectedFolderFullPath={store.selectedFolderFullPath}
            changeFolderSelection={this.props.changeFolderSelection}
          />
        </Scroller>
      </div>,
    ];
  }

  queueClear = () => {
    this.setState({
      selections: [],
    });
  };

  queueFiles = () => {
    this.props.queueFiles(this.state.selections);
    this.setState({
      selections: [],
    });
  };

  renderGlobalError() {
    const errors = this.props.errors || {};
    const errorKey = 'fileLoader-global';

    const showGlobalError = errors.displayFlags[errorKey] || false;
    const globalErrorMessage = errors.messages[errorKey] || '';
    return (
      <DismissibleMessage
        error={true}
        visible={showGlobalError}
        icon="warning circle"
        header="An error has occurred"
        content={globalErrorMessage}
        onDismiss={this.props.dismissError}
        dismissParams={[errorKey]}
      />
    );
  }

  renderFilteredFilesNotif() {
    const store = this.props.store || {};
    if (store.isLoading) {
      return null;
    }

    // These are the number of files that were initially removed probably because they're corrupted
    const errorFileCount = _.get(store, 'numErroredFiles');
    const durationFilterCount = _.get(store, 'numDurationFilteredFiles');
    const totalFilteredCount = _.get(store, 'numFilteredFiles');
    if (totalFilteredCount === 0) {
      return null;
    }

    let contentText =
      `Replays shorter than ${MIN_GAME_LENGTH_SECONDS} seconds are automatically filtered.`;

    if (errorFileCount > 0) {
      if (durationFilterCount > 0) {
        // There are corrupted files and filtered files
        contentText = `${errorFileCount} corrupt files detected. Non-corrupt replays shorter than ${MIN_GAME_LENGTH_SECONDS} seconds are automatically filtered.`;
      } else {
        contentText = `${errorFileCount} corrupt files detected.`;
      }
    }
    const showHideButton = durationFilterCount > 0 && store.filterReplays;

    const onShowAnywayClick = () => {
      // Clear the currently loaded files
      this.props.storeFileLoadState({
        filesToRender: [],
        filesOffset: 0,
      });
      // Clear the selection and disable replay filter
      this.props.setFilterReplays(false);
      this.setState({
        selections: [],
      });
    }

    return (
      <Message
        info={true}
        icon="info circle"
        header={`${totalFilteredCount} Files have been filtered`}
        content={<>
          <span>{contentText}</span> {showHideButton && <button type="button" className={styles['show-anyway']} onClick={onShowAnywayClick}>Click to show all</button>}
        </>}
      />
    );
  }

  renderFilterButton() {
    const store = this.props.store || {};
    if (store.isLoading) {
      return null;
    }

    const dropdownOptions = [
      {text: 'Character', value: 'character'},
      {text: 'Player', value: 'player'},
      {text: 'Stage', value: 'stage'},
      {text: 'Filename', value: 'filename'},
    ];

    return (
      <div className={styles['filter-dropdown-content']}>
        <Dropdown
          className={styles['filter-dropdown-content']}
          inline={true}
          options={dropdownOptions}
          defaultValue={dropdownOptions[0].value}
          onChange={this.onDropdownInputChange}/>
        <Form>
          <Input
            key="gameFilter"
            fluid={true}
            inverted={true}
            placeholder="Filter Matches"
            action={
              <Button onClick={this.onSearchClick} icon='search'/>
            }
            onChange={this.onTextInputChange}
          />
        </Form>
      </div>
    );
  }

  onDropdownInputChange = (e, control) => {
    const searchData = this.state.searchData || {};
    this.setState({
      searchData: {
        ...searchData,
        "dropSelect": control["value"],
      },
    });
  }

  onTextInputChange = (e, control) => {
    const searchData = this.state.searchData || {};
    this.setState({
      searchData: {
        ...searchData,
        "filterText": control["value"],
      },
    });
  }

  onSearchClick = () => {
    const store = this.props.store || {};
    const searchData = this.state.searchData || {};
    const dropSelect = searchData.dropSelect || "character";

    const allFiles = (store.filterReplays ? store.files : store.allFiles) || [];

    // set view back to unfiltered
    if (!searchData.filterText) {
      const end = Math.min(GAME_BATCH_SIZE, allFiles.length);
      const nextFilesToRender = allFiles.slice(0, end);

      this.props.storeFileLoadState({
        filesToRender: nextFilesToRender,
        filesOffset: end,
        hasLoaded: true,
      });
      return;
    }

    let filterFunc;
    switch (dropSelect) {
    case "character":
      filterFunc = file => {
        const players = file.game.getSettings().players || {};
        return players.some(playerObj => characterUtils.getCharacterName(playerObj.characterId).toLowerCase().includes(searchData.filterText.toLowerCase()));
      }
      break;
    case "player":
      filterFunc = file => {
        const playerObj = file?.game?.metadata?.players || {};
        // returns array of object values
        return Object.values(playerObj).some(players => {
          const name = players?.names?.netplay || "";
          return name.toLowerCase().includes(searchData.filterText.toLowerCase());
        });
      }
      break;
    case "stage":
      filterFunc = file => {
        const settings = file.game.getSettings() || {};
        const stageId = settings.stageId;

        const stageName = stageUtils.getStageName(stageId);
        return stageName.toLowerCase().includes(searchData.filterText.toLowerCase());
      }
      break;
    case "filename":
      filterFunc = file => file.fileName.toLowerCase().includes(searchData.filterText.toLowerCase());
      break;
    default:
      return; // stop searching
    }

    // Searches files in chunks to limit slow downs from large data set
    let filteredMatches = [];
    const chunksOfMatches = _.chunk(allFiles, GAME_BATCH_SIZE);
    chunksOfMatches.forEach(chunk => {
      if (filteredMatches.length >= GAME_BATCH_SIZE) {
        return;
      }
      filteredMatches = filteredMatches.concat(chunk.filter(filterFunc));
    });
    const newFilesOffset = filteredMatches.length;

    this.props.storeFileLoadState({
      filesToRender: filteredMatches,
      filesOffset: newFilesOffset,
      hasLoaded: true,
    });
  }

  renderEmptyLoader() {
    const folders = this.props.store.folders || {};
    const rootFolderName = this.props.store.rootFolderName || '';

    if (!folders[rootFolderName]) {
      return this.renderMissingRootFolder();
    }

    return (
      <div className={styles['empty-loader-content']}>
        <Header
          as="h2"
          icon={true}
          color="grey"
          inverted={true}
          textAlign="center"
        >
          <Icon name="search" />
          <Header.Content>
            No Replay Files Found
            <Header.Subheader>
              Place slp files in the folder to browse
            </Header.Subheader>
          </Header.Content>
        </Header>
      </div>
    );
  }

  renderMissingRootFolder() {
    return (
      <div className={styles['empty-loader-content']}>
        <Header
          as="h2"
          icon={true}
          color="grey"
          inverted={true}
          textAlign="center"
        >
          <Icon name="folder outline" />
          <Header.Content>
            Root Folder Missing
            <Header.Subheader>
              Go to the settings page to select a root slp folder
            </Header.Subheader>
          </Header.Content>
        </Header>
        <Segment basic={true} textAlign="center">
          <Link to="/settings">
            <Button color="blue" size="large">
              Select Folder
            </Button>
          </Link>
        </Segment>
      </div>
    );
  }

  renderLoadingState() {
    const store = this.props.store || {};
    return (
      <Loader
        className={styles['loader']}
        inverted={true}
        active={store.isLoading}
        indeterminate={true}
        inline="centered"
        size="big"
      >
        <span>Loading Files...</span>
      </Loader>
    );
  }

  renderFileSelection() {
    const store = this.props.store || {};

    const allFiles = (store.filterReplays ? store.files : store.allFiles) || [];

    const filesToRender = _.get(store, ['fileLoadState', 'filesToRender']) || [];
    const filesOffset = _.get(store, ['fileLoadState', 'filesOffset']) || 0;
    const hasLoaded = _.get(store, ['fileLoadState', 'hasLoaded']) || false;

    if (store.isLoading) {
      return this.renderLoadingState();
    }

    // If we have no files to display, render an empty state
    if (!allFiles.length) {
      return this.renderEmptyLoader();
    }

    // Generate header row
    const headerRow = (
      <Table.Row>
        <Table.HeaderCell />
        <Table.HeaderCell>Details</Table.HeaderCell>
        <Table.HeaderCell>Time</Table.HeaderCell>
        <Table.HeaderCell />
      </Table.Row>
    );

    // Generate a row for every file in selected folder
    let fileIndex = 0;
    const rows = filesToRender.map(
      file => (
        <FileRow
          key={file.fullPath}
          file={file}
          playFile={this.props.playFile}
          setStatsGamePage={this.props.setStatsGamePage}
          onSelect={this.onSelect}
          selectedOrdinal={this.state.selections.indexOf(file) + 1}
          fileIndex={fileIndex++}
        />
      ),
      this
    );

    const bufferMoreFiles = (e, { calculations }) => {
      const start = filesOffset;
      const end = Math.min(start + GAME_BATCH_SIZE, allFiles.length);

      if ((calculations.percentagePassed > 0.5 &&
          start < allFiles.length) ||
        !hasLoaded) {
        const nextFilesToRender = allFiles.slice(start, end);

        this.props.storeFileLoadState({
          filesToRender: filesToRender.concat(nextFilesToRender),
          filesOffset: end,
          hasLoaded: true,
        });
      }
    };

    return (
      <Table
        className={styles['file-table']}
        basic="very"
        celled={true}
        inverted={true}
        selectable={true}
      >
        <Table.Header>{headerRow}</Table.Header>
        <Visibility updateOn="repaint" as="tbody" onUpdate={bufferMoreFiles}>
          {rows}
        </Visibility>
      </Table>
    );
  }
  
  deleteSelections = () => {
    this.props.deleteSelections(this.state.selections);
    this.setState({
      selections: [],
    });
    this.renderMain();
  }

  renderQueueButtons() {
    if (this.state.selections.length === 0) {
      return;
    }
    return (
      <div className={styles['queue-buttons']}>
        <Button onClick={this.queueFiles}>
          <Icon name="play circle" />
          Play all
        </Button>
        <Button onClick={this.queueClear}>
          <Icon name="dont" />
          Clear
        </Button>
        <Button onClick={this.deleteSelections}>
          <Icon name="trash alternate outline" />
            Delete
        </Button>
      </div>
    );
  }

  renderMain() {
    const mainStyles = `main-padding ${styles['loader-main']}`;

    return (
      <div className={mainStyles}>
        <PageHeader
          icon="disk"
          text="Replay Browser"
          history={this.props.history}
        />
        <Scroller
          ref={this.setTableScrollRef}
          topOffset={this.props.topNotifOffset}
        >
          {this.renderGlobalError()}
          {this.renderFilteredFilesNotif()}
          {this.renderFilterButton()}
          {this.renderFileSelection()}
        </Scroller>
        {this.renderQueueButtons()}
      </div>
    );
  }

  render() {
    return (
      <PageWrapper history={this.props.history}>
        <div className={styles['layout']}>
          {this.renderSidebar()}
          {this.renderMain()}
        </div>
      </PageWrapper>
    );
  }
}
