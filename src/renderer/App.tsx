import "typeface-roboto/index.css";
import "overlayscrollbars/css/OverlayScrollbars.css";
import "./styles/styles.scss";

import { hot } from "react-hot-loader/root";
import firebase from "firebase";
import React from "react";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect,
} from "react-router-dom";

import { init } from "./lib/init";
import { AppContext, Action, AppProvider } from "./store";
import { HomeView } from "./views/HomeView";
import { LoadingView } from "./views/LoadingView";
import { MuiThemeProvider, StylesProvider } from "@material-ui/core/styles";
import { slippiTheme } from "./styles/theme";
import { LandingView } from "./views/LandingView";
import { NotFoundView } from "./views/NotFoundView";
import { SettingsView } from "./views/SettingsView";

const App: React.FC = () => {
  const { state, dispatch } = React.useContext(AppContext);
  React.useEffect(() => {
    // Initialize firebase
    const startup = init((message) => {
      dispatch({
        type: Action.SET_INSTALL_STATUS,
        payload: message,
      });
    });

    // Subscribe to user auth changes
    const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
      dispatch({
        type: Action.SET_USER,
        payload: {
          user,
        },
      });

      startup
        .then(() => {
          // Clear the installation status when finished
          dispatch({
            type: Action.SET_INSTALL_STATUS,
            payload: "",
          });
        })
        .catch((err) => {
          // Set the install status as the error message
          dispatch({
            type: Action.SET_INSTALL_STATUS,
            payload: err.message,
          });
        })
        .finally(() => {
          // Tell the rest of the app we're done loading
          if (!state.initialized) {
            dispatch({
              type: Action.SET_INITIALIZED,
            });
          }
        });
    });

    // Unsubscribe on unmount
    return unsubscribe;
  }, []);

  if (!state.initialized) {
    return <LoadingView />;
  }

  return (
    <Router>
      <Switch>
        <Route path="/home" component={HomeView} />
        <Route path="/landing" component={LandingView} />
        <Route path="/settings" component={SettingsView} />
        <Redirect exact from="/" to="/landing" />
        <Route component={NotFoundView} />
      </Switch>
    </Router>
  );
};

// Providers need to be initialized before the rest of the app can use them
const AppWithProviders: React.FC = () => {
  return (
    <AppProvider>
      <StylesProvider injectFirst>
        <MuiThemeProvider theme={slippiTheme}>
          <App />
        </MuiThemeProvider>
      </StylesProvider>
    </AppProvider>
  );
};

// eslint-disable-next-line import/no-default-export
export default hot(AppWithProviders);