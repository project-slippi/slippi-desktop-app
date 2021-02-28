import { Checkbox, Link } from "@material-ui/core";
import { GlobalStats, MatchupAggregate } from "common/game";
import _ from "lodash";
import React, { useState } from "react";

import { getCharacterIcon } from "@/lib/utils";

import * as T from "../ReplayFileStats/TableStyles";

export const OpponentTable: React.FC<{ stats: GlobalStats; hidden: string[]; setFiltered: (f: string[]) => void }> = ({
  stats,
  hidden,
  setFiltered,
}) => {
  const [selected, setSelected] = useState([] as string[]);

  const setHide = () => {
    setFiltered([...selected, ...hidden]);
    setSelected([]);
  };

  const setClear = () => {
    setFiltered([]);
    setSelected([]);
  };

  const setCheck = (isChecked: boolean, player: string) => {
    if (isChecked) {
      setSelected([...selected, player]);
    } else {
      setSelected(selected.filter((p) => p !== player));
    }
  };

  const renderFilterControls = () => {
    return (
      <div style={{ alignSelf: "right" }}>
        {selected.length > 0 || hidden.length > 0 ? <Link onClick={setClear}>Clear</Link> : null}
        {selected.length > 0 ? <Link onClick={setHide}>Hide</Link> : null}
      </div>
    );
  };

  const renderHeaderPlayer = () => {
    const headerText = "Top Opponents";
    return (
      <T.TableRow>
        <T.TableHeaderCell colSpan={5}>
          <div style={{ display: "flex" }}>
            {headerText}
            {renderFilterControls()}
          </div>
        </T.TableHeaderCell>
      </T.TableRow>
    );
  };

  const renderHeaderColumns = () => {
    return (
      <T.TableRow>
        <T.TableHeaderCell></T.TableHeaderCell>
        <T.TableHeaderCell>Player</T.TableHeaderCell>
        <T.TableHeaderCell>Games</T.TableHeaderCell>
        <T.TableHeaderCell>Winrate</T.TableHeaderCell>
        <T.TableHeaderCell>Characters</T.TableHeaderCell>
      </T.TableRow>
    );
  };

  const renderRows = () => {
    const oppStats = stats.opponents;
    return Object.keys(oppStats)
      .sort((a, b) => oppStats[b].count - oppStats[a].count)
      .slice(0, 26)
      .map((k) => generateOpponentRow(k, oppStats[k]))
      .slice(0, 9);
  };

  const generateOpponentRow = (playerTag: string, agg: MatchupAggregate) => {
    const chars = agg.charIds.map((charId: number) => (
      <T.GrayableImage key={charId} src={getCharacterIcon(charId, 0)} height={24} width={24} />
    ));

    return (
      <T.TableRow key={`${playerTag}-${agg.count}`}>
        <T.TableCell style={{ alignItems: "center" }}>
          <Checkbox
            color="default"
            checked={selected.includes(playerTag)}
            onChange={(e) => setCheck(e.target.checked, playerTag)}
          />
        </T.TableCell>
        <T.TableCell>{playerTag}</T.TableCell>
        <T.TableCell>{agg.count}</T.TableCell>
        <T.TableCell>{((agg.won / agg.count) * 100).toFixed(0)}%</T.TableCell>
        <T.TableCell>
          <div style={{ display: "flex", alignItems: "center" }}>{chars.slice(0, 5)}</div>
        </T.TableCell>
      </T.TableRow>
    );
  };

  return (
    <T.Table>
      {renderHeaderPlayer()}
      {renderHeaderColumns()}
      {renderRows()}
    </T.Table>
  );
};
