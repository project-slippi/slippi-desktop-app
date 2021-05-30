import "./styles/styles.scss";

import Snackbar from "@material-ui/core/Snackbar";
import { MuiThemeProvider, StylesProvider } from "@material-ui/core/styles";
import log from "electron-log";
import firebase from "firebase";
import React from "react";
import { hot } from "react-hot-loader/root";
import { QueryClient, QueryClientProvider } from "react-query";
import { HashRouter as Router, Redirect, Route, Switch } from "react-router-dom";

import { useApp } from "@/store/app";

import { initializeFirebase } from "./lib/firebase";
import { slippiTheme } from "./styles/theme";
import { HomeView } from "./views/HomeView";
import { LandingView } from "./views/LandingView";
import { LoadingView } from "./views/LoadingView";
import { NotFoundView } from "./views/NotFoundView";
import { SettingsView } from "./views/SettingsView";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Once we've fetched a query never refetch
      staleTime: Infinity,
      refetchIntervalInBackground: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false,
    },
  },
});

const App: React.FC = () => {
  const initialized = useApp((state) => state.initialized);
  const snackbarOpen = useApp((state) => state.snackbarOpen);
  const snackbarContent = useApp((state) => state.snackbarContent);
  const dismissSnackbar = useApp((state) => state.dismissSnackbar);
  const init = useApp((state) => state.initialize);
  const setUser = useApp((state) => state.setUser);

  React.useEffect(() => {
    // Initialize the Firebase app if we haven't already
    try {
      initializeFirebase();
    } catch (err) {
      log.error("Error initializing firebase. Did you forget to create a .env file from the .env.example file?");
      init();
      return;
    }

    // Subscribe to user auth changes
    const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
      // Set the user
      setUser(user);

      // Initialize the rest of the app
      init();
    });

    // Unsubscribe on unmount
    return unsubscribe;
  }, []);

  if (!initialized) {
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
      <Snackbar open={snackbarOpen} onClose={dismissSnackbar}>
        {snackbarContent}
      </Snackbar>
    </Router>
  );
};

// Providers need to be initialized before the rest of the app can use them
const AppWithProviders: React.FC = () => {
  return (
    <StylesProvider injectFirst>
      <MuiThemeProvider theme={slippiTheme}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </MuiThemeProvider>
    </StylesProvider>
  );
};

// eslint-disable-next-line import/no-default-export
export default hot(AppWithProviders);
