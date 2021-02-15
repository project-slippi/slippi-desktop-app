import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import CardMedia from "@material-ui/core/CardMedia";
import IconButton from "@material-ui/core/IconButton";
import { createStyles, makeStyles } from "@material-ui/core/styles";
import Tooltip from "@material-ui/core/Tooltip";
import Typography from "@material-ui/core/Typography";
import EqualizerIcon from "@material-ui/icons/Equalizer";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import { stages as stageUtils } from "@slippi/slippi-js";
import { FileResult } from "common/replayBrowser";
import { convertFrameCountToDurationString, monthDayHourFormat } from "common/time";
import _ from "lodash";
import moment from "moment";
import React from "react";

import { DraggableFile } from "@/components/DraggableFile";
import { getStageImage } from "@/lib/utils";

import { TeamElements } from "./TeamElements";

const useStyles = makeStyles(() =>
  createStyles({
    root: {
      display: "flex",
      height: 75,
      margin: 10,
    },
    details: {
      display: "flex",
      flex: 1,
      flexDirection: "column",
      paddingLeft: 15,
      paddingRight: 15,
    },
    content: {
      flex: "1 0 auto",
      padding: 0,
    },
    cover: {
      width: 75,
      position: "relative",
    },
    controls: {
      display: "flex",
      alignItems: "center",
    },
    footer: {
      fontSize: 13,
      paddingBottom: 6,
      display: "flex",
      justifyContent: "space-between",
    },
    filename: {
      "&:hover": {
        textDecoration: "underline",
      },
    },
    duration: {
      position: "absolute",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      top: 0,
      right: 0,
      padding: 3,
      fontSize: 12,
    },
  }),
);

export interface ReplayFileProps extends FileResult {
  index: number;
  style?: React.CSSProperties;
  onSelect: () => void;
  onPlay: () => void;
  onOpenMenu: (index: number, element: HTMLElement) => void;
}

export const ReplayFile: React.FC<ReplayFileProps> = ({
  index,
  onOpenMenu,
  style,
  onSelect,
  onPlay,
  header,
  details,
}) => {
  const classes = useStyles();
  if (details !== null) {
    const date = new Date(details.startTime ? Date.parse(details.startTime) : 0);

    let stageName = "Unknown";
    try {
      if (details.settings.stageId !== null) {
        stageName = stageUtils.getStageName(details.settings.stageId);
      }
    } catch (err) {
      console.error(err);
    }

    return (
      <div style={style}>
        <Card className={classes.root}>
          {details.settings.stageId !== null && (
            <CardMedia className={classes.cover} image={getStageImage(details.settings.stageId)} title={stageName}>
              {details.lastFrame !== null && (
                <div className={classes.duration}>{convertFrameCountToDurationString(details.lastFrame)}</div>
              )}
            </CardMedia>
          )}
          <div className={classes.details}>
            <div style={{ display: "flex", flexDirection: "row", flex: 1 }}>
              <CardContent className={classes.content}>
                <TeamElements settings={details.settings} metadata={details.metadata} />
              </CardContent>
              <div className={classes.controls}>
                <Tooltip title="View replay">
                  <IconButton onClick={onPlay}>
                    <PlayArrowIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Show stats">
                  <IconButton onClick={onSelect}>
                    <EqualizerIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="More options">
                  <IconButton
                    onClick={(e) => {
                      onOpenMenu(index, e.currentTarget as any);
                    }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </Tooltip>
              </div>
            </div>
            <div className={classes.footer}>
              <div>{monthDayHourFormat(moment(date))}</div>
              <div>
                <DraggableFile fullPath={header.fullPath} className={classes.filename}>
                  {header.name}
                </DraggableFile>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  } else {
    const message = `Loading ${header.name}...`;
    return (
      <div style={style}>
        <Card className={classes.root}>
          <Typography variant="h6" style={{ marginTop: 20 }}>
            {message}
          </Typography>
        </Card>
      </div>
    );
  }
};
