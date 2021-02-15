import Button from "@material-ui/core/Button";
import Chip from "@material-ui/core/Chip";
import IconButton from "@material-ui/core/IconButton";
import { makeStyles } from "@material-ui/core/styles";
import Tooltip from "@material-ui/core/Tooltip";
import Typography from "@material-ui/core/Typography";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";
import ArrowBackIosIcon from "@material-ui/icons/ArrowBackIos";
import ArrowForwardIosIcon from "@material-ui/icons/ArrowForwardIos";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import { GameStartType, MetadataType, PlayerType, stages as stageUtils, StatsType } from "@slippi/slippi-js";
import { colors } from "common/colors";
import { extractPlayerNames, PlayerNames } from "common/matchNames";
import { FileDetails } from "common/replayBrowser";
import { convertFrameCountToDurationString, monthDayHourFormat } from "common/time";
import _ from "lodash";
import moment from "moment";
import React from "react";
import styled from "styled-components";

import { getCharacterIcon, getStageImage } from "@/lib/utils";

const useStyles = makeStyles({
  labelSmall: {
    fontSize: 12,
    opacity: 0.8,
    backgroundColor: "#2D313A",
  },
});

interface PlayerIndicatorProps {
  player: PlayerType;
  names: PlayerNames;
  isTeams?: boolean;
}

const PlayerIndicator: React.FC<PlayerIndicatorProps> = ({ player, names }) => {
  const classes = useStyles();
  const backupName = player.type === 1 ? "CPU" : "Player";
  const charIcon = getCharacterIcon(player.characterId, player.characterColor);
  // const teamId = isTeams ? player.teamId : null;
  return (
    <PlayerInfo>
      <Typography variant="h6" style={{ display: "flex", alignItems: "center" }}>
        <img src={charIcon} />
        {names.name || names.tag || `${backupName} ${player.port}`}
      </Typography>
      {names.code && (
        <div style={{ textAlign: "center" }}>
          <Chip className={classes.labelSmall} size="small" label={names.code} />
        </div>
      )}
    </PlayerInfo>
  );
};

const PlayerInfo = styled.div`
  margin: 0 15px;
  display: flex;
  flex-direction: column;
  font-size: 22px;
  img {
    width: 32px;
    margin-right: 8px;
  }
`;

const Outer = styled.div`
  margin-top: 10px;
  display: flex;
  flex-direction: row;
  align-items: center;
`;

interface PlayerInfoDisplayProps {
  settings: GameStartType;
  metadata: MetadataType | null;
}

const PlayerInfoDisplay: React.FC<PlayerInfoDisplayProps> = ({ settings, metadata }) => {
  const teams = _.chain(settings.players)
    .groupBy((player) => (settings.isTeams ? player.teamId : player.port))
    .toArray()
    .value();

  const elements: JSX.Element[] = [];
  teams.forEach((team, idx) => {
    team.forEach((player) => {
      const names = extractPlayerNames(player.playerIndex, settings, metadata);
      elements.push(
        <PlayerIndicator
          key={`player-${player.playerIndex}`}
          player={player}
          isTeams={Boolean(settings.isTeams)}
          names={names}
        />,
      );
    });

    // Add VS obj in between teams
    if (idx < teams.length - 1) {
      // If this is not the last team, add a "vs" element
      elements.push(
        <div
          key={`vs-${idx}`}
          style={{
            fontWeight: "bold",
            color: "rgba(255, 255, 255, 0.5)",
            padding: "0 20px",
            fontSize: 20,
          }}
        >
          vs
        </div>,
      );
    }
  });
  return <Outer>{...elements}</Outer>;
};

export interface GameProfileHeaderProps {
  file: FileDetails;
  index: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  onPlay: () => void;
  onClose: () => void;
  loading?: boolean;
  stats: StatsType | null;
}

export const GameProfileHeader: React.FC<GameProfileHeaderProps> = ({
  stats,
  loading,
  file,
  index,
  total,
  onNext,
  onPrev,
  onPlay,
  onClose,
}) => {
  const { metadata, settings } = file;
  const stageImage = settings.stageId !== null ? getStageImage(settings.stageId) : undefined;
  return (
    <Header backgroundImage={stageImage}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex" }}>
            <div>
              <Tooltip title="Back to replays">
                <span>
                  <IconButton onClick={onClose} disabled={loading}>
                    <ArrowBackIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </div>
            <PlayerInfoDisplay metadata={metadata} settings={settings} />
          </div>
          <GameDetails file={file} stats={stats} />
        </div>
        <Controls disabled={loading} index={index} total={total} onNext={onNext} onPrev={onPrev} onPlay={onPlay} />
      </div>
    </Header>
  );
};

const Header = styled.div<{
  backgroundImage?: any;
}>`
  z-index: 1;
  top: 0;
  width: 100%;
  border-bottom: solid 2px ${colors.grayDark};
  background-size: cover;
  background-position: center center;
  background-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.5) 0 30%, rgba(0, 0, 0, 0.8) 90%)
    ${(p) =>
      p.backgroundImage
        ? `,
    url("${p.backgroundImage}")`
        : ""};
`;

const GameDetails: React.FC<{
  file: FileDetails;
  stats: StatsType | null;
}> = ({ file, stats }) => {
  let stageName = "Unknown";
  try {
    stageName = stageUtils.getStageName(file.settings.stageId !== null ? file.settings.stageId : 0);
  } catch (err) {
    console.error(err);
  }

  const platform = _.get(file.metadata, "playedOn") || "Unknown";

  const startAtDisplay = new Date(file.startTime ? Date.parse(file.startTime) : 0);

  // Sometimes metadata doesn't exist and won't have the last frame
  // but we might have the stats computed which contains the real last frame.
  // In that situation, we should use that lastFrame not the metadata one.
  let duration = _.get(file.metadata, "lastFrame");
  if (duration === null || duration === undefined) {
    duration = _.get(stats, "lastFrame");
  }
  const durationLength =
    duration !== null && duration !== undefined ? convertFrameCountToDurationString(duration) : "Unknown";

  const displayData = [
    {
      label: "Stage",
      content: stageName,
    },
    {
      label: "Duration",
      content: durationLength,
    },
    {
      label: "Time",
      content: monthDayHourFormat(moment(startAtDisplay)) as string,
    },
    {
      label: "Platform",
      content: platform,
    },
  ];

  const metadataElements = displayData.map((details) => {
    return (
      <div key={details.label} style={{ margin: 10 }}>
        <DetailLabel>{details.label}</DetailLabel>
        <DetailContent>{details.content}</DetailContent>
      </div>
    );
  });

  return <div style={{ display: "flex", padding: "0 10px" }}>{metadataElements}</div>;
};

const Controls: React.FC<{
  disabled?: boolean;
  index: number;
  total: number;
  onPlay: () => void;
  onPrev: () => void;
  onNext: () => void;
}> = ({ disabled, index, total, onPlay, onPrev, onNext }) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        margin: 10,
      }}
    >
      <div>
        <Button variant="outlined" onClick={onPlay} startIcon={<PlayArrowIcon />}>
          View Replay
        </Button>
      </div>
      <div
        style={{
          marginTop: 10,
          display: "grid",
          gridAutoFlow: "column",
          alignItems: "center",
          justifyContent: "center",
          gridGap: 10,
        }}
      >
        <Tooltip title="Previous replay">
          <span>
            <IconButton disabled={disabled || index === 0} onClick={onPrev} size="small">
              <ArrowBackIosIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <div style={{ fontSize: 12 }}>
          {index + 1} / {total}
        </div>
        <Tooltip title="Next replay">
          <span>
            <IconButton disabled={disabled || index === total - 1} onClick={onNext} size="small">
              <ArrowForwardIosIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </div>
    </div>
  );
};

const DetailLabel = styled.label`
  font-weight: bold;
  opacity: 0.6;
  font-size: 14px;
  margin-right: 5px;
`;

// `text-transform: capitalize` doesn't work unless it's an inline-block
// See: https://stackoverflow.com/a/49783868 for more info
const DetailContent = styled.label`
  text-transform: capitalize;
  display: inline-block;
  font-size: 14px;
`;
