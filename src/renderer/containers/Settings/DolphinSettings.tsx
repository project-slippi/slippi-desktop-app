/** @jsx jsx */
import { ipc_clearDolphinCache, ipc_configureDolphin, ipc_migrateDolphin, ipc_reinstallDolphin } from "@dolphin/ipc";
import { DolphinLaunchType } from "@dolphin/types";
import { css, jsx } from "@emotion/react";
import Button from "@material-ui/core/Button";
import CircularProgress from "@material-ui/core/CircularProgress";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import { isLinux } from "common/constants";
import { shell } from "electron";
import _ from "lodash";
import React from "react";
import { useToasts } from "react-toast-notifications";

import { ConfirmationModal } from "@/components/ConfirmationModal";
import { DevGuard } from "@/components/DevGuard";
import { PathInput } from "@/components/PathInput";
import { useDolphinPath } from "@/lib/hooks/useSettings";

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

export const DolphinSettings: React.FC<{ dolphinType: DolphinLaunchType }> = ({ dolphinType }) => {
  const [dolphinPath, setDolphinPath] = useDolphinPath(dolphinType);
  const [resetModalOpen, setResetModalOpen] = React.useState(false);
  const [importModalOpen, setImportModalOpen] = React.useState(false);
  const [importPath, setImportPath] = React.useState("");
  const [isResetting, setIsResetting] = React.useState(false);
  const classes = useStyles();
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

  const importDolphinHandler = async () => {
    const importObj =
      dolphinType === DolphinLaunchType.NETPLAY
        ? { migrateNetplay: importPath }
        : { migratePlayback: true, migratePlaybackPath: importPath };
    const importSettings = Object.assign({ migrateNetplay: null, migratePlayback: false }, importObj);
    await ipc_migrateDolphin.renderer!.trigger(importSettings);
    setImportPath("");
  };

  return (
    <div>
      <Typography variant="h5" className={classes.title}>
        {dolphinType} Dolphin Settings
      </Typography>
      <DevGuard show={isLinux}>
        <SettingItem name={`${dolphinType} Dolphin Directory`} description="The path to Dolphin.">
          <PathInput
            value={dolphinPath ?? ""}
            onSelect={setDolphinPath}
            placeholder="No folder set"
            options={{ properties: ["openDirectory"] }}
          />
        </SettingItem>
      </DevGuard>
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
          <Button variant="outlined" color="secondary" onClick={openDolphinDirectoryHandler} disabled={isResetting}>
            Open containing folder
          </Button>
        </div>
      </SettingItem>
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
            Reset everything{" "}
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
      {!isLinux && (
        <SettingItem name={`Import ${dolphinType} Dolphin Settings`}>
          <ConfirmationModal
            title="Import Dolphin Settings"
            open={importModalOpen}
            onClose={() => setImportModalOpen(false)}
            onSubmit={importDolphinHandler}
            confirmText="Import"
          >
            Select the location of your old {_.capitalize(dolphinType)} Dolphin app.
            <div
              css={css`
                margin-top: 20px;
              `}
            >
              <PathInput
                onSelect={(path) => setImportPath(path)}
                placeholder={`No ${_.capitalize(dolphinType)} Dolphin selected`}
                value={importPath}
              />
            </div>
          </ConfirmationModal>
          <Button variant="contained" color="secondary" onClick={() => setImportModalOpen(true)} disabled={isResetting}>
            Import
          </Button>
        </SettingItem>
      )}
    </div>
  );
};
