import { GameFilters, GlobalStats } from "common/game";
import React from "react";

import { StatSection } from "../ReplayFileStats/GameProfile";
import { CharacterTable } from "./CharacterTable";
import { ComboTable } from "./ComboTable";
import { GlobalTable } from "./GlobalTable";
import { OpponentTable } from "./OpponentTable";

interface PlayerProfileProps {
  stats: GlobalStats;
  player: string;
  filters: GameFilters;
  queryFilters: (filters: GameFilters) => void;
}
export const PlayerProfile: React.FC<PlayerProfileProps> = (props) => {
  const setCharacterFilter = (f: number[]) => {
    const newFilters = {
      characters: f,
      opponents: props.filters.opponents,
      opponentCharacters: props.filters.opponentCharacters,
    };
    props.queryFilters(newFilters);
  };

  const setOpponentCharacterFilter = (f: number[]) => {
    const newFilters = {
      characters: props.filters.characters,
      opponents: props.filters.opponents,
      opponentCharacters: f,
    };
    props.queryFilters(newFilters);
  };

  const setOpponentFilter = (f: string[]) => {
    const newFilters = {
      characters: props.filters.characters,
      opponents: f,
      opponentCharacters: props.filters.opponentCharacters,
    };
    props.queryFilters(newFilters);
  };

  return (
    <div style={{ flex: "1", margin: "auto", maxWidth: 1500 }}>
      <StatSection title="Characters">
        <CharacterTable
          opponent={false}
          stats={props.stats}
          hidden={props.filters.characters}
          setFiltered={setCharacterFilter}
        />
        <OpponentTable stats={props.stats} hidden={props.filters.opponents} setFiltered={setOpponentFilter} />
        <CharacterTable
          opponent={true}
          stats={props.stats}
          hidden={props.filters.opponentCharacters}
          setFiltered={setOpponentCharacterFilter}
        />
      </StatSection>
      <StatSection title="Global Stats">
        <GlobalTable stats={props.stats} />
      </StatSection>
      <StatSection title="Conversions">
        <ComboTable player={props.player} stats={props.stats} />
      </StatSection>
    </div>
  );
};
