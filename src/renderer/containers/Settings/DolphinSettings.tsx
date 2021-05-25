
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import Checkbox from "@material-ui/core/Checkbox";
import CircularProgress from "@material-ui/core/CircularProgress";
import Dialog from "@material-ui/core/Dialog";
import DialogContent from "@material-ui/core/DialogContent";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Tab from "@material-ui/core/Tab";
import Tabs from "@material-ui/core/Tabs";
import TextField from "@material-ui/core/TextField";

import Typography from "@material-ui/core/Typography";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import ErrorIcon from "@material-ui/icons/Error";
import { DolphinLaunchType } from "common/dolphin";
import { ipcRenderer as ipc } from "electron-better-ipc";
import React from "react";

import { PathInput } from "@/components/PathInput";

import { getFilesInDir, getGeckos, updateGeckos, writeGecko } from "@/lib/utils";

import { useSettings } from "@/store/settings";

import { SettingItem } from "./SettingItem";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    validation: {
      display: "flex",
      alignItems: "center",
      marginRight: 10,
    },
    invalid: {
      color: theme.palette.error.main,
    },
    valid: {
      color: theme.palette.success.main,
    },
    validationText: {
      marginRight: 5,
      fontWeight: 500,
    },
    title: {
      textTransform: "capitalize",
    },
  }),
);

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return <div {...other}>{value === index && <Box p={3}>{children}</Box>}</div>;
}


export const DolphinSettings: React.FC<{ dolphinType: DolphinLaunchType }> = ({ dolphinType }) => {
  const dolphinPath = useSettings((state) => state.settings[dolphinType].path);
  const verifying = useSettings((state) => state.verifyingDolphinPath);
  const isValidDolphinPath = useSettings((state) => state.validDolphinPath);
  const verifyAndSetDolphinPath = useSettings((state) => state.verifyAndSetDolphinPath);
  const setDolphinFolderPath = useSettings((state) => state.setDolphinFolderPath);


  //vars for editing gecko codes/ ini files
  const [iniFiles, setIniFiles] = React.useState([]);
  const [iniPath, setIniPath] = React.useState("");
  const [openGecko, setOpenGecko] = React.useState(false);
  const [tabValue, setTabValue] = React.useState(0);
  const [geckoName, setGeckoName] = React.useState("");
  const [geckoBody, setGeckoBody] = React.useState("");
  const [geckoCodes, setGeckoCodes] = React.useState([]);
  const [checked, setChecked] = React.useState([]);

  const classes = useStyles();

  const onDolphinFolderSelect = React.useCallback(
    (dolphinPath: string) => {
      setDolphinFolderPath(dolphinType, dolphinPath);
      verifyAndSetDolphinPath(dolphinType, dolphinPath);
    },
    [setDolphinFolderPath],
  );


  //when dolphinPath is changed, change where we read ini files from
  React.useEffect(() => {
    const filesArray = getFilesInDir(`${dolphinPath}/FM-Slippi/Sys/GameSettings`);
    setIniFiles(filesArray);
  }, [dolphinPath]);

  //when there are a new set of gecko codes, update the checked array
  React.useEffect(() => {
    if (geckoCodes) {
      const newChecked: number[] = [];
      geckoCodes.map((gecko: string) => {
        if (gecko[0] == "$") {
          newChecked.push(1);
        } else {
          newChecked.push(0);
        }
      });
      setChecked(newChecked);
    }
  }, [geckoCodes]);

  const configureDolphin = async () => {
    console.log("configure dolphin pressesd");
    await ipc.callMain<string, never>("configureDolphin", dolphinType);
  };

  const resetDolphin = async () => {
    console.log("reset button clicked");
    await ipc.callMain<string, never>("resetDolphin", dolphinType);
  };

  const loadGeckoCodes = async () => {
    console.log("getting geckos");
    const geckoCodesArr = await getGeckos(iniPath);
    setGeckoCodes(geckoCodesArr);
  };

  //creates a new gecko based on form and appends to [Gecko]
  const writeGeckoCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("writing to gecko ini");
    await writeGecko(iniPath, geckoName, geckoBody);
    document.getElementById("geckoForm").reset();
  };

  //rewrites [Gecko_Enabled] based on the values in checked
  const saveEnabledGeckos = () => {
    updateGeckos(iniPath, checked);
  };

  //handles gecko window
  const handleClickOpenGecko = () => {
    setOpenGecko(true);
  };
  //handles gecko window
  const handleGeckoClose = () => {
    setOpenGecko(false);
  };
  //handles gecko window tabs
  // eslint-disable-next-line @typescript-eslint/ban-types
  const handleChange = (e: React.ChangeEvent<{}>, newValue: number) => {
    setTabValue(newValue);
  };

  //handles the checklist in the gecko window
  const handleToggle = (i: number) => async () => {
    const currentValue = checked[i];
    const newChecked = checked.slice();
    if (currentValue === 1) {
      newChecked[i] = 0;
    } else {
      newChecked[i] = 1;
    }
    setChecked(newChecked);

  const reinstallDolphin = async () => {
    console.log("reinstall button clicked");
    await ipc.callMain<string, never>("reinstallDolphin", dolphinType);

  };
  return (
    <div>
      <Typography variant="h5" className={classes.title}>
        {dolphinType} Dolphin Options
      </Typography>
      <SettingItem name="Dolphin Directory" description="The path to Dolphin.">
        <PathInput
          value={dolphinPath !== null ? dolphinPath : ""}
          onSelect={onDolphinFolderSelect}
          placeholder="No folder set"
          disabled={verifying}
          options={{ properties: ["openDirectory"] }}
          endAdornment={
            <div
              className={`${classes.validation} ${verifying ? "" : classes[isValidDolphinPath ? "valid" : "invalid"]}`}
            >
              <span className={classes.validationText}>
                {verifying ? "Verifying..." : isValidDolphinPath ? "Valid" : "Invalid"}
              </span>
              {verifying ? (
                <CircularProgress size={25} color="inherit" />
              ) : isValidDolphinPath ? (
                <CheckCircleIcon />
              ) : (
                <ErrorIcon />
              )}
            </div>
          }
        />
      </SettingItem>

      <SettingItem name="Gecko Codes" description="Manage and Add Gecko Codes">
        <Button variant="outlined" color="primary" onClick={handleClickOpenGecko}>
          Gecko Codes
        </Button>
      </SettingItem>
      <Dialog open={openGecko} onClose={handleGeckoClose}>
        <Tabs value={tabValue} onChange={handleChange}>
          <Tab label="Add" />
          <Tab label="Manage" />
        </Tabs>
        <DialogContent>
          <select
            id="iniPicker"
            onChange={(e) => setIniPath(`${dolphinPath}/FM-Slippi/Sys/GameSettings/${e.target.value}`)}
          >
            {!iniFiles ? (
              <option key="GALE01.ini">GALE01.ini</option>
            ) : (
              iniFiles.map((iniName: string, i: number) => (
                <option key={`ini-${i}`} value={iniName}>
                  {iniName}
                </option>
              ))
            )}
          </select>
          <TabPanel value={tabValue} index={0}>
            <form id="geckoForm" onSubmit={writeGeckoCodes}>
              <TextField
                type="text"
                id="geckoTitle"
                label="Gecko Name"
                variant="outlined"
                margin="normal"
                onChange={({ target: { value } }) => setGeckoName(value)}
                fullWidth
                required
              ></TextField>
              <TextField
                type="textarea"
                id="geckoBody"
                label="A Bunch of Numbers"
                variant="outlined"
                margin="normal"
                rows="15"
                onChange={({ target: { value } }) => setGeckoBody(value)}
                multiline
                fullWidth
                required
              ></TextField>
              <Button type="submit" fullWidth variant="contained" color="primary">
                Add
              </Button>
            </form>
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <List>
              {!geckoCodes ? (
                <ListItem>No Codes Found</ListItem>
              ) : (
                geckoCodes.map((gecko: string, i: number) => (
                  <ListItem key={`checkbox-item-${i}`} dense>
                    <Checkbox
                      id={`checkbox-${i}`}
                      checked={checked[i] === 1}
                      disableRipple
                      onChange={handleToggle(i)}
                    />
                    <ListItemText primary={gecko.substring(1)} />
                  </ListItem>
                ))
              )}
            </List>
            <Button fullWidth onClick={loadGeckoCodes} color="primary" variant="contained">
              Refresh
            </Button>
            <Button fullWidth onClick={saveEnabledGeckos} color="primary" variant="contained">
              Save
            </Button>
          </TabPanel>
        </DialogContent>
      </Dialog>

      <SettingItem name="Configure Dolphin" description="Open Dolphin to modify settings.">
        <button onClick={configureDolphin}>Configure Dolphin</button>
      </SettingItem>
      <SettingItem name="Reinstall Dolphin" description="Delete and reinstall dolphin">
        <button onClick={reinstallDolphin}>Reset Dolphin</button>
      </SettingItem>

    </div>
  );
};
