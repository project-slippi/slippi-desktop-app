import Typography from "@material-ui/core/Typography";
import { StatsType } from "@slippi/slippi-js";
import { FileResult } from "common/replayBrowser/types";
import _ from "lodash";
import React from "react";
import styled from "styled-components";

import { KillTable } from "./KillTable";
import { OverallTable } from "./OverallTable";
import { PunishTable } from "./PunishTable";

export interface GameProfileProps {
  file: FileResult;
  stats: StatsType;
}

const TableContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  grid-gap: 20px;
`;

export const StatSection: React.FC<{
  title: string;
}> = (props) => {
  return (
    <div style={{ padding: 10 }}>
      <Typography variant="h5" style={{ marginBottom: 10 }}>
        {props.title}
      </Typography>
      <TableContainer>{props.children}</TableContainer>
    </div>
  );
};

export const GameProfile: React.FC<GameProfileProps> = ({ file, stats }) => {
  return (
    <div style={{ flex: "1", margin: 20 }}>
      <StatSection title="Overall">
        <OverallTable file={file} stats={stats} />
      </StatSection>
      <StatSection title="Kills">
        <KillTable file={file} stats={stats} playerIndex={0} />
        <KillTable file={file} stats={stats} playerIndex={1} />
      </StatSection>
      <StatSection title="Openings &amp; Conversions">
        <PunishTable file={file} stats={stats} playerIndex={0} />
        <PunishTable file={file} stats={stats} playerIndex={1} />
      </StatSection>
    </div>
  );
};
