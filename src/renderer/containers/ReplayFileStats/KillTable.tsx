import {
  StatsType,
  Frames,
  animations as animationUtils,
  moves as moveUtils,
} from "@slippi/slippi-js";
import { FileResult } from "../../../common/replayBrowser/types";
import React from "react";
import { convertFrameCountToDurationString } from "../../../common/time";
import _ from "lodash";
import * as T from "./TableStyles";
import { extractPlayerNames } from "common/matchNames";
import { getCharacterIcon } from "@/lib/utils";

const columnCount = 5;
export interface KillsTableProps {
  file: FileResult;
  stats: StatsType;
  playerIndex: number;
}

export const KillsTable: React.FC<KillsTableProps> = ({
  file,
  stats,
  playerIndex,
}) => {
  const player = file.settings.players[playerIndex];
  const playerName = extractPlayerNames(
    playerIndex,
    file.settings,
    file.metadata
  );
  const playerDisplay = (
    <div style={{ display: "inline-block" }}>
      <div style={{ display: "inline-block", margin: "10px 10px" }}>
        {playerName.name}
      </div>
      <img
        src={getCharacterIcon(
          player.characterId ?? 0,
          player.characterColor ?? 0
        )}
        height={24}
        width={24}
        style={{
          marginRight: "0px",
          marginTop: "8px",
          position: "absolute",
        }}
      />
    </div>
  );
  const generateStockRow = (stock) => {
    let start = convertFrameCountToDurationString(stock.startFrame);
    // let end = <span className={styles['secondary-text']}>–</span>;
    let end = "–";

    // let killedBy = <span className={styles['secondary-text']}>–</span>;
    // let killedDirection = <span className={styles['secondary-text']}>–</span>;
    let killedBy = <span>–</span>;
    let killedDirection = <span>–</span>;

    const percent = `${Math.trunc(stock.currentPercent)}%`;

    const isFirstFrame = stock.startFrame === Frames.FIRST;
    if (isFirstFrame) {
      // start = <span className={styles['secondary-text']}>–</span>;
      start = "–";
    }

    if (stock.endFrame) {
      end = convertFrameCountToDurationString(stock.endFrame);

      killedBy = renderKilledBy(stock);
      killedDirection = renderKilledDirection(stock);
    }

    return (
      <T.TableRow key={`${stock.playerIndex}-stock-${stock.startFrame}`}>
        <T.TableCell>{start}</T.TableCell>
        <T.TableCell>{end}</T.TableCell>
        <T.TableCell>{killedBy}</T.TableCell>
        <T.TableCell>{killedDirection}</T.TableCell>
        <T.TableCell>{percent}</T.TableCell>
      </T.TableRow>
    );
  };

  const renderKilledBy = (stock) => {
    // Here we are going to grab the opponent's punishes and see if one of them was
    // responsible for ending this stock, if so show the kill move, otherwise assume SD
    const punishes = _.get(stats, "conversions") || [];
    const punishesByPlayer = _.groupBy(punishes, "playerIndex");
    const playerPunishes = punishesByPlayer[playerIndex] || [];

    // Only get punishes that killed
    const killingPunishes = _.filter(playerPunishes, "didKill");
    const killingPunishesByEndFrame = _.keyBy(killingPunishes, "endFrame");
    const punishThatEndedStock = killingPunishesByEndFrame[stock.endFrame];

    if (!punishThatEndedStock) {
      // return <span className={styles['secondary-text']}>Self Destruct</span>;
      return <span>Self Destruct</span>;
    }

    const lastMove = _.last(punishThatEndedStock.moves);
    if (!lastMove) {
      return <span>Grab Release</span>;
    }
    return <span>{moveUtils.getMoveName(lastMove.moveId)}</span>;
  };

  const renderKilledDirection = (stock) => {
    const killedDirection = animationUtils.getDeathDirection(
      stock.deathAnimation
    );

    return (
      //TODO killed direction icons
      // <Icon name={`arrow ${killedDirection}`} color="green" inverted={true} />
      <div>{killedDirection}</div>
    );
  };

  const renderHeaderPlayer = () => {
    return (
      <T.TableRow>
        <T.TableHeaderCell colSpan={columnCount}>
          {playerDisplay}
        </T.TableHeaderCell>
      </T.TableRow>
    );
  };

  const renderHeaderColumns = () => {
    return (
      <T.TableRow>
        <T.TableSubHeaderCell>Start</T.TableSubHeaderCell>
        <T.TableSubHeaderCell>End</T.TableSubHeaderCell>
        <T.TableSubHeaderCell>Kill Move</T.TableSubHeaderCell>
        <T.TableSubHeaderCell>Direction</T.TableSubHeaderCell>
        <T.TableSubHeaderCell>Percent</T.TableSubHeaderCell>
      </T.TableRow>
    );
  };

  const renderStocksRows = () => {
    const stocks = _.get(stats, "stocks") || [];
    const stocksByOpponent = _.groupBy(stocks, "opponentIndex");
    const opponentStocks = stocksByOpponent[playerIndex] || [];

    return opponentStocks.map(generateStockRow);
  };

  return (
    <div style={{ width: "510px" }}>
      <T.Table>
        <thead>
          {renderHeaderPlayer()}
          {renderHeaderColumns()}
        </thead>

        <tbody>{renderStocksRows()}</tbody>
      </T.Table>
    </div>
  );
};
