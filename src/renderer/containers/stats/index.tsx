import ErrorIcon from "@material-ui/icons/Error";
import HelpIcon from "@material-ui/icons/Help";
import { colors } from "common/colors";
import { GameFilters } from "common/game";
import _ from "lodash";
import React from "react";
import styled from "styled-components";

import { LoadingScreen } from "@/components/LoadingScreen";
import { IconMessage } from "@/components/Message";
import { useReplays } from "@/store/replays";

import { PlayerProfile } from "./PlayerProfile";

const Outer = styled.div`
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Content = styled.div`
  display: flex;
  flex: 1;
  overflow: auto;
`;

const Footer = styled.div`
  display: inline-block;
  white-space: nowrap;
  padding: 5px;
  background-color: ${colors.grayDark};
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export interface ReplayFileStatsProps {
  player: string;
  onClose: () => void;
  // file: FileResult;
  // index: number;
  // total: number;
  // onNext: () => void;
  // onPrev: () => void;
  // onClose: () => void;
}

export const PlayerStats: React.FC<ReplayFileStatsProps> = (props) => {
  const loading = useReplays((store) => store.selectedPlayer.loading);
  const error = useReplays((store) => store.selectedPlayer.error);
  const player = useReplays((store) => store.selectedPlayer.player);
  const filters = useReplays((store) => store.selectedPlayer.filters);
  const gameStats = useReplays((store) => store.selectedPlayer.stats);
  const update = useReplays((store) => store.selectPlayer);

  const keyDownFunction = (event: { keyCode: number }) => {
    if (loading) {
      return;
    }

    switch (event.keyCode) {
      case 27: // Escape
        props.onClose();
        break;
    }
  };

  React.useEffect(() => {
    document.addEventListener("keydown", keyDownFunction, false);
    return () => document.removeEventListener("keydown", keyDownFunction, false);
  }, [keyDownFunction]);

  const queryFilters = (filters: GameFilters) => {
    console.log(filters);
    update(props.player, filters);
  };

  return (
    <Outer>
      <Content>
        {loading ? (
          <LoadingScreen message={"Crunching numbers..."} />
        ) : error ? (
          <IconMessage Icon={ErrorIcon} label={`Error: ${error.message ?? JSON.stringify(error, null, 2)}`} />
        ) : gameStats ? (
          <PlayerProfile
            player={player!}
            stats={gameStats}
            filters={filters}
            queryFilters={queryFilters}
          ></PlayerProfile>
        ) : (
          <IconMessage Icon={HelpIcon} label="No stats computed" />
        )}
      </Content>
      <Footer>{player}</Footer>
    </Outer>
  );
};
