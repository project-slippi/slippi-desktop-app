import _ from "lodash";
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import GameProfile from '../components/stats/GameProfile';
import { playFile, setStatsGamePage } from "../actions/fileLoader";
import { dismissError } from "../actions/error";

function mapStateToProps(state) {
  const index = state.fileLoader.statsGameIndex;
  const files = state.fileLoader.filterReplays ? state.fileLoader.files : state.fileLoader.allFiles || {};
  const file = files[index] || null;
  return {
    store: state.game,
    statsGameIndex: index,
    file: file,
    errors: state.errors,
    topNotifOffset: _.get(state.notifs, ['activeNotif', 'heightPx']) || 0,
  };
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({
    playFile: playFile,
    dismissError: dismissError,
    setStatsGamePage: setStatsGamePage,
  }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(GameProfile);
