/** @jsx jsx */
import { clearDolphinCache, configureDolphin, reinstallDolphin } from "@dolphin/ipc";
import { DolphinLaunchType } from "@dolphin/types";
import { css, jsx } from "@emotion/react";
import Button from "@material-ui/core/Button";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import { isLinux } from "common/constants";
import React from "react";
import { useToasts } from "react-toast-notifications";

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
  const classes = useStyles();
  const { addToast } = useToasts();
  const configureDolphinHandler = async () => {
    console.log("configure dolphin pressed");
    if (process.platform === "darwin") {
      addToast("Dolphin may open in the background, please check the app bar", {
        appearance: "info",
        autoDismiss: true,
      });
    }
    await configureDolphin.renderer!.trigger({ dolphinType });
  };
  const reinstallDolphinHandler = async () => {
    console.log("reinstall button clicked");
    await reinstallDolphin.renderer!.trigger({ dolphinType });
  };
  const clearDolphinCacheHandler = async () => {
    await clearDolphinCache.renderer!.trigger({ dolphinType });
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
      <SettingItem name="Configure Dolphin" description="Open Dolphin to modify settings.">
        <Button
          variant="contained"
          color="primary"
          onClick={configureDolphinHandler}
          css={css`
            text-transform: capitalize;
          `}
        >
          Configure {dolphinType} Dolphin
        </Button>
      </SettingItem>
      <SettingItem name="Clear Dolphin Cache" description="Clear Dolphin's graphics cache.">
        <Button
          variant="contained"
          color="primary"
          onClick={clearDolphinCacheHandler}
          css={css`
            text-transform: capitalize;
          `}
        >
          Clear {dolphinType} Dolphin Cache
        </Button>
      </SettingItem>
      <SettingItem name="Reset Dolphin" description="Delete and reinstall dolphin">
        <Button
          variant="outlined"
          color="secondary"
          onClick={reinstallDolphinHandler}
          css={css`
            text-transform: capitalize;
          `}
        >
          Reset {dolphinType} Dolphin
        </Button>
      </SettingItem>
    </div>
  );
};
