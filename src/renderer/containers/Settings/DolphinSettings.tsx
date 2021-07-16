/** @jsx jsx */
import { makeGeckoCodeFromRaw, GeckoCode, TruncGeckoCode } from "@dolphin/geckoCode";
import {
  ipc_clearDolphinCache,
  ipc_configureDolphin,
  ipc_importDolphinSettings,
  ipc_reinstallDolphin,
  ipc_fetchGeckoCodes,
  ipc_fetchSysInis,
  ipc_convertGeckoToRaw,
  ipc_toggleGeckos,
  ipc_addGeckoCode,
  ipc_deleteGecko,
} from "@dolphin/ipc";
import { DolphinLaunchType } from "@dolphin/types";
import AssignmentIcon from "@material-ui/icons/Assignment";
import { css, jsx } from "@emotion/react";
import { Box, Tab, Tabs } from "@material-ui/core";
import Button from "@material-ui/core/Button";
import Checkbox from "@material-ui/core/Checkbox";
import CircularProgress from "@material-ui/core/CircularProgress";
import DeleteIcon from "@material-ui/icons/Delete";
import Dialog from "@material-ui/core/Dialog";
import DialogContent from "@material-ui/core/DialogContent";
import IconButton from "@material-ui/core/IconButton";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import LockIcon from "@material-ui/icons/Lock";
import Select from "@material-ui/core/Select";
import { makeStyles } from "@material-ui/core/styles";
import TextField from "@material-ui/core/TextField";
import Typography from "@material-ui/core/Typography";
import { isLinux, isMac } from "common/constants";
import { remote, shell } from "electron";
import log from "electron-log";
import capitalize from "lodash/capitalize";
import React from "react";
import { useToasts } from "react-toast-notifications";

import { ConfirmationModal } from "@/components/ConfirmationModal";
import { DevGuard } from "@/components/DevGuard";
import { PathInput } from "@/components/PathInput";
import { useDolphinPath } from "@/lib/hooks/useSettings";

import { SettingItem } from "./SettingItem";

function TabPanel(props: any) {
  const { children, value, index, ...other } = props;

  return (
    <div role="tabpanel" hidden={value !== index} id={`full-width-tabpanel-${index}`} {...other}>
      {value === index && (
        <Box p={3}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

export const DolphinSettings: React.FC<{ dolphinType: DolphinLaunchType }> = ({ dolphinType }) => {
  const [dolphinPath, setDolphinPath] = useDolphinPath(dolphinType);

  const [resetModalOpen, setResetModalOpen] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);
  const { addToast } = useToasts();

  const openDolphinDirectoryHandler = async () => {
    shell.openItem(dolphinPath);
  };

  const configureDolphinHandler = async () => {
    if (process.platform === "darwin") {
      addToast("Dolphin may open in the background, please check the app bar", {
        appearance: "info",
        autoDismiss: true,
      });
    }
    await ipc_configureDolphin.renderer!.trigger({ dolphinType });
  };

  const reinstallDolphinHandler = async () => {
    setIsResetting(true);
    await ipc_reinstallDolphin.renderer!.trigger({ dolphinType });
    setIsResetting(false);
  };

  const clearDolphinCacheHandler = async () => {
    await ipc_clearDolphinCache.renderer!.trigger({ dolphinType });
  };

  const dolphinTypeName = capitalize(dolphinType);
  return (
    <div>
      <Typography variant="h5">{dolphinTypeName} Dolphin Settings</Typography>
      <SettingItem name={`Configure ${dolphinType} Dolphin`}>
        <div
          css={css`
            display: flex;
            & > button {
              margin-right: 10px;
            }
          `}
        >
          <Button variant="contained" color="primary" onClick={configureDolphinHandler} disabled={isResetting}>
            Configure Dolphin
          </Button>
          <Button variant="outlined" color="primary" onClick={openDolphinDirectoryHandler} disabled={isResetting}>
            Open containing folder
          </Button>
        </div>
      </SettingItem>
      <DevGuard show={isLinux}>
        <SettingItem
          name={`${dolphinType} Dolphin Directory`}
          description={`The path containing the ${dolphinTypeName} Dolphin executable.`}
        >
          <PathInput
            value={dolphinPath ?? ""}
            onSelect={setDolphinPath}
            placeholder="No folder set"
            options={{ properties: ["openDirectory"] }}
          />
        </SettingItem>
      </DevGuard>
      {!isLinux && <ImportDolphinConfigForm dolphinType={dolphinType} />}
      <SettingItem name={`Reset ${dolphinType} Dolphin`}>
        <ConfirmationModal
          open={resetModalOpen}
          onClose={() => setResetModalOpen(false)}
          onSubmit={reinstallDolphinHandler}
          title="Are you sure?"
        >
          This will remove all your {dolphinType} dolphin settings.
        </ConfirmationModal>
        <div
          css={css`
            display: flex;
            & > button {
              margin-right: 10px;
            }
          `}
        >
          <Button variant="contained" color="secondary" onClick={clearDolphinCacheHandler} disabled={isResetting}>
            Clear cache
          </Button>
          <Button variant="outlined" color="secondary" onClick={() => setResetModalOpen(true)} disabled={isResetting}>
            Reset everything
            {isResetting && (
              <CircularProgress
                css={css`
                  margin-left: 10px;
                `}
                size={16}
                thickness={6}
                color="inherit"
              />
            )}
          </Button>
        </div>
      </SettingItem>
      <EditGeckoCodesForm dolphinType={dolphinType} />
    </div>
  );
};

const ImportDolphinConfigForm: React.FC<{
  dolphinType: DolphinLaunchType;
}> = ({ dolphinType }) => {
  const { addToast } = useToasts();
  const dolphinTypeName = capitalize(dolphinType);
  const extension = isMac ? "app" : "exe";
  const importDolphinHandler = async (importPath: string) => {
    log.info(`importing dolphin from ${importPath}`);
    await ipc_importDolphinSettings.renderer!.trigger({ toImportDolphinPath: importPath, type: dolphinType });
  };

  const onImportClick = async () => {
    const result = await remote.dialog.showOpenDialog({
      filters: [{ name: "Slippi Dolphin", extensions: [isMac ? "app" : "exe"] }],
    });
    const res = result.filePaths;
    if (result.canceled || res.length === 0) {
      return;
    }
    importDolphinHandler(res[0])
      .then(() => {
        addToast(`${dolphinTypeName} Dolphin settings successfully imported`, { appearance: "success" });
      })
      .catch((err) => {
        addToast(err.message ?? JSON.stringify(err), { appearance: "error" });
      });
  };

  return (
    <SettingItem
      name={`Import ${dolphinTypeName} Dolphin Settings`}
      description={`Replace the ${dolphinTypeName} Dolphin settings with those from a different Dolphin application. To do this, select the Dolphin.${extension} with the desired ${dolphinType} settings.`}
    >
      <Button variant="contained" color="secondary" onClick={onImportClick}>
        Import Dolphin settings
      </Button>
    </SettingItem>
  );
};

const useStyles = makeStyles({
  geckoDialog: {
    display: "flex",
    flexDirection: "column",
  },
});

const EditGeckoCodesForm: React.FC<{
  dolphinType: DolphinLaunchType;
}> = ({ dolphinType }) => {
  const { addToast } = useToasts();
  const classes = useStyles();
  //vars for editing gecko codes
  const [tabValue, setTabValue] = React.useState(0);
  const [geckoFormOpen, setGeckoFormOpen] = React.useState(false);
  const [newGeckoCodeRaw, setNewGeckoCodeRaw] = React.useState("");
  const [geckoCodes, setGeckoCodes] = React.useState<TruncGeckoCode[]>([]);
  const [geckoCheckboxes, setGeckoCheckboxes] = React.useState(<div />);
  const [iniSelect, setIniSelect] = React.useState(<div />);
  const [sysIni, setSysIni] = React.useState("");

  React.useEffect(() => {
    void (async () => {
      const sysFilesArray = (await fetchSysInisHandler()).result?.sysInis;
      const iniList =
        !sysFilesArray || sysFilesArray.length === 0 ? (
          <option key="loading.ini">loading</option>
        ) : (
          <Select labelId="ini-label" native={true} id="iniPicker" onChange={handleIniChange}>
            {sysFilesArray.map((iniName: string, i: number) => (
              <option key={`ini-${i}`} value={iniName}>
                {iniName}
              </option>
            ))}
          </Select>
        );
      setIniSelect(iniList);
      if (sysFilesArray) {
        setSysIni(sysFilesArray[0]);
        const codes = (await fetchGeckoCodesHandler(sysFilesArray[0])).result?.tCodes;
        if (codes) {
          setGeckoCodes(codes);
        } else {
          setGeckoCodes([]);
        }
      }
    })();
  }, [geckoFormOpen]);

  React.useEffect(() => {
    const checkboxList = (
      <List>
        {!geckoCodes || geckoCodes.length === 0 ? (
          <ListItem>No Codes Found</ListItem>
        ) : (
          geckoCodes.map((gecko: TruncGeckoCode, i: number) => (
            <ListItem key={gecko.name} id={`checkbox-item-${i}`} dense>
              <Checkbox
                id={`checkbox-${i}`}
                checked={gecko.enabled}
                disableRipple
                onChange={() => {
                  gecko.enabled = !gecko.enabled;
                  setGeckoCodes([...geckoCodes]);
                }}
              />
              <ListItemText primary={gecko.name} />
              <IconButton>
                <AssignmentIcon
                  onClick={async () => {
                    const rawGecko = (await convertGeckoCodeToRawHandler(gecko.name)).result?.rawGecko;
                    await navigator.clipboard.writeText(rawGecko !== undefined ? rawGecko : "");
                    addToast(`Copied "${gecko.name}" To Clipboard`, { appearance: "success", autoDismiss: true });
                  }}
                />
              </IconButton>
              {gecko.userDefined ? (
                <IconButton>
                  <DeleteIcon
                    onClick={async () => {
                      if (window.confirm(`Are You Sure You Want To Delete "${gecko.name}"?`)) {
                        await deleteGeckoHandler(gecko.name);
                      }
                    }}
                  />
                </IconButton>
              ) : (
                <LockIcon />
              )}
            </ListItem>
          ))
        )}
      </List>
    );
    setGeckoCheckboxes(checkboxList);
  }, [geckoCodes]);

  const fetchSysInisHandler = async () => {
    return await ipc_fetchSysInis.renderer!.trigger({ dolphinType: dolphinType });
  };

  const fetchGeckoCodesHandler = async (iniFileName: string) => {
    return await ipc_fetchGeckoCodes.renderer!.trigger({ dolphinType: dolphinType, iniName: iniFileName });
  };

  const convertGeckoCodeToRawHandler = async (geckoCodeName: string) => {
    return await ipc_convertGeckoToRaw.renderer!.trigger({
      geckoCodeName: geckoCodeName,
      iniName: sysIni,
      dolphinType: dolphinType,
    });
  };

  const toggleGeckosHandler = async () => {
    await ipc_toggleGeckos.renderer!.trigger({ tCodes: geckoCodes, iniName: sysIni, dolphinType: dolphinType });
    addToast(`${sysIni} updated`, { appearance: "success", autoDismiss: true });
  };

  const addGeckoCodeHandler = async (gCode: GeckoCode) => {
    await ipc_addGeckoCode.renderer!.trigger({ gCode: gCode, iniName: sysIni, dolphinType: dolphinType });
    addToast(`${sysIni} updated`, { appearance: "success", autoDismiss: true });
  };

  const deleteGeckoHandler = async (geckoCodeName: string) => {
    await ipc_deleteGecko.renderer!.trigger({
      geckoCodeName: geckoCodeName,
      iniName: sysIni,
      dolphinType: dolphinType,
    });
    setGeckoCodes(geckoCodes.filter((code) => code.name !== geckoCodeName));
    addToast(`${sysIni} updated`, { appearance: "success", autoDismiss: true });
  };

  const writeGeckoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const gCode = makeGeckoCodeFromRaw(newGeckoCodeRaw);
    if (gCode.name.length > 0) {
      const tCode: TruncGeckoCode = {
        name: gCode.name,
        enabled: gCode.enabled,
        userDefined: gCode.userDefined,
      };
      geckoCodes.push(tCode);
      setGeckoCodes([...geckoCodes]);
      await addGeckoCodeHandler(gCode);
      document.getElementById("geckoForm").reset();
    } else {
      addToast(`failed to write gecko`, { appearance: "error", autoDismiss: true });
    }
  };

  const handleTabChange = (event: React.ChangeEvent<unknown>, newValue: number) => {
    setTabValue(newValue);
  };

  const handleIniChange = async ({ target: { value } }) => {
    setSysIni(value);
    const codes = (await fetchGeckoCodesHandler(value)).result?.tCodes;
    if (codes) {
      setGeckoCodes(codes);
    } else {
      setGeckoCodes([]);
    }
  };

  return (
    <div>
      <SettingItem name={"Gecko Codes"}>
        <Button variant="contained" color="secondary" onClick={() => setGeckoFormOpen(true)}>
          Gecko Codes
        </Button>
      </SettingItem>
      <Dialog
        open={geckoFormOpen}
        onClose={() => {
          setGeckoFormOpen(false);
        }}
      >
        <DialogContent className={classes.geckoDialog}>
          <Tabs value={tabValue} variant="fullWidth" onChange={handleTabChange}>
            <Tab label="Add" />
            <Tab label="Manage" />
          </Tabs>
          {iniSelect}
          <TabPanel value={tabValue} index={0}>
            <form id="geckoForm" onSubmit={writeGeckoCode}>
              <TextField
                type="textarea"
                id="geckoCode"
                label="Paste Gecko Code Here"
                variant="outlined"
                margin="normal"
                rows="18"
                onChange={({ target: { value } }) => setNewGeckoCodeRaw(value)}
                multiline
                fullWidth
                required
              ></TextField>
              <Button type="submit" fullWidth variant="outlined" color="secondary">
                Add
              </Button>
            </form>
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            {geckoCheckboxes}
            <Button color="secondary" variant="outlined" fullWidth onClick={toggleGeckosHandler}>
              Save
            </Button>
          </TabPanel>
        </DialogContent>
      </Dialog>
    </div>
  );
};
