import Avatar from "@material-ui/core/Avatar";
import Badge from "@material-ui/core/Badge";
import Chip from "@material-ui/core/Chip";
import { makeStyles } from "@material-ui/core/styles";
import { GameStartType, MetadataType, PlayerType } from "@slippi/slippi-js";
import { getPortColor, getTeamColor } from "common/colors";
import { extractPlayerNames } from "common/matchNames";
import _ from "lodash";
import React from "react";
import styled from "styled-components";

import { getCharacterIcon } from "@/lib/utils";

function getColor(port: number, teamId: number | null) {
  if (teamId !== null) {
    return getTeamColor(teamId);
  }
  return getPortColor(port);
}

const useStyles = makeStyles<any, { backgroundColor: string }>({
  badge: {
    backgroundColor: (props) => props.backgroundColor,
  },
});

interface PlayerIndicatorProps {
  player: PlayerType;
  name: string;
  isTeams?: boolean;
  link: boolean;
  onClick: (player: string) => void;
}

const PlayerIndicator: React.FC<PlayerIndicatorProps> = ({ player, name, isTeams, onClick }) => {
  const charIcon = getCharacterIcon(player.characterId, player.characterColor);
  const teamId = isTeams ? player.teamId : null;
  const color = getColor(player.port, teamId);
  const classes = useStyles({ backgroundColor: color });

  return (
    <Badge component="div" classes={{ badge: classes.badge }} badgeContent={`P${player.port}`}>
      <Chip
        onClick={() => onClick(name)}
        avatar={<Avatar alt="Natacha" src={charIcon} variant="square" />}
        label={name}
      />
    </Badge>
  );
};

const Outer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-top: 15px;
  & > div {
    margin-right: 15px;
  }
`;

export interface TeamElementProps {
  settings: GameStartType;
  metadata: MetadataType | null;
  onClick: (player: string) => void;
}

export const TeamElements: React.FC<TeamElementProps> = ({ settings, metadata, onClick }) => {
  // If this is a teams game, group by teamId, otherwise group players individually
  const teams = _.chain(settings.players)
    .groupBy((player) => (settings.isTeams ? player.teamId : player.port))
    .toArray()
    .value();

  const elements: JSX.Element[] = [];
  teams.forEach((team, idx) => {
    team.forEach((player) => {
      const backupName = player.type === 1 ? "CPU" : "Player";
      const names = extractPlayerNames(player.playerIndex, settings, metadata);
      elements.push(
        <PlayerIndicator
          key={`player-${player.playerIndex}`}
          player={player}
          isTeams={Boolean(settings.isTeams)}
          name={names.code || names.tag || backupName}
          link={names.code !== null}
          onClick={onClick}
        />,
      );
    });

    // Add VS obj in between teams
    if (idx < teams.length - 1) {
      // If this is not the last team, add a "vs" element
      elements.push(
        <div key={`vs-${idx}`} style={{ color: "rgba(255, 255, 255, 0.5)" }}>
          vs
        </div>,
      );
    }
  });
  return <Outer>{...elements}</Outer>;
};
