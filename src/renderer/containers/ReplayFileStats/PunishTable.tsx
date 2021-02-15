import { ConversionType, StatsType, StockType } from "@slippi/slippi-js";
import { extractPlayerNames } from "common/matchNames";
import { FileDetails } from "common/replayBrowser";
import { convertFrameCountToDurationString } from "common/time";
import _ from "lodash";
import React from "react";

import { getCharacterIcon, toOrdinal } from "@/lib/utils";

import * as T from "./TableStyles";

const columnCount = 6;

export interface PunishTableProps {
  file: FileDetails;
  stats: StatsType;
  playerIndex: number;
}

export const PunishTable: React.FC<PunishTableProps> = ({ file, stats, playerIndex }) => {
  const player = file.settings.players[playerIndex];
  const names = extractPlayerNames(playerIndex, file.settings, file.metadata);
  const playerDisplay = (
    <div style={{ display: "flex", alignItems: "center" }}>
      <img
        src={getCharacterIcon(player.characterId, player.characterColor)}
        height={24}
        width={24}
        style={{
          marginRight: 10,
        }}
      />
      <div style={{ fontWeight: 500 }}>{names.name ? names.name : "Player " + (playerIndex + 1)}</div>
    </div>
  );

  const generatePunishRow = (punish: ConversionType) => {
    const start = convertFrameCountToDurationString(punish.startFrame);
    let end = "–";

    const damage = renderDamageCell(punish);
    const damageRange = renderDamageRangeCell(punish);
    const openingType = renderOpeningTypeCell(punish);

    if (punish.endFrame !== null && punish.endFrame !== undefined) {
      end = convertFrameCountToDurationString(punish.endFrame);
    }

    return (
      <T.TableRow key={`${punish.playerIndex}-punish-${punish.startFrame}`}>
        <T.TableCell>{start}</T.TableCell>
        <T.TableCell>{end}</T.TableCell>
        <T.TableCell>{damage}</T.TableCell>
        <T.TableCell>{damageRange}</T.TableCell>
        <T.TableCell>{punish.moves.length}</T.TableCell>
        <T.TableCell>{openingType}</T.TableCell>
      </T.TableRow>
    );
  };

  const generateEmptyRow = (stock: StockType) => {
    const player = getPlayer(stock.playerIndex);
    let stockIndex = 0;
    if (player.startStocks !== null) {
      stockIndex = player.startStocks - stock.count + 1;
    }

    return (
      <T.TableRow key={`no-punishes-${stock.count}`}>
        <T.TableCell colSpan={columnCount}>{"No punishes on opponent's " + toOrdinal(stockIndex)} stock</T.TableCell>
      </T.TableRow>
    );
  };

  const generateStockRow = (stock: StockType) => {
    const player = getPlayer(stock.playerIndex);

    const totalStocks = _.get(player, "startStocks");
    const currentStocks = stock.count - 1;

    const stockIcons = _.range(1, totalStocks !== null ? totalStocks + 1 : 1).map((stockNum) => {
      return (
        <T.GrayableImage
          key={`stock-image-${stock.playerIndex}-${stockNum}`}
          gray={stockNum > currentStocks}
          src={getCharacterIcon(player.characterId, player.characterColor)}
          height={20}
          width={20}
        />
      );
    });

    const key = `${stock.playerIndex}-stock-lost-${currentStocks}`;
    return (
      <T.TableRow key={key}>
        <T.TableCell colSpan={columnCount}>
          <div>{stockIcons}</div>
        </T.TableCell>
      </T.TableRow>
    );
  };

  const getPlayer = (playerIndex: number) => {
    const players = file.settings.players || [];
    const playersByIndex = _.keyBy(players, "playerIndex");
    return playersByIndex[playerIndex];
  };

  const renderDamageCell = (punish: ConversionType) => {
    const difference = punish.currentPercent - punish.startPercent;

    let diffColor = "green";
    if (difference >= 70) {
      diffColor = "red";
    } else if (difference >= 35) {
      diffColor = "yellow";
    }

    const diffDisplay = `${Math.trunc(difference)}%`;

    return <div style={{ color: diffColor }}>{diffDisplay}</div>;
  };

  const renderDamageRangeCell = (punish: ConversionType) => {
    return <div>{`(${Math.trunc(punish.startPercent)}% - ${Math.trunc(punish.currentPercent)}%)`}</div>;
  };

  const renderOpeningTypeCell = (punish: ConversionType) => {
    const textTranslation = {
      "counter-attack": "Counter Hit",
      "neutral-win": "Neutral",
      trade: "Trade",
    };

    return <div>{textTranslation[punish.openingType]}</div>;
  };

  const renderHeaderPlayer = () => {
    return (
      <T.TableRow>
        <T.TableHeaderCell colSpan={columnCount}>{playerDisplay}</T.TableHeaderCell>
      </T.TableRow>
    );
  };

  const renderHeaderColumns = () => {
    return (
      <T.TableRow>
        <T.TableSubHeaderCell>Start</T.TableSubHeaderCell>
        <T.TableSubHeaderCell>End</T.TableSubHeaderCell>
        <T.TableSubHeaderCell colSpan={2}>Damage</T.TableSubHeaderCell>
        <T.TableSubHeaderCell>Moves</T.TableSubHeaderCell>
        <T.TableSubHeaderCell>Opening</T.TableSubHeaderCell>
      </T.TableRow>
    );
  };

  const renderPunishRows = () => {
    const punishes = _.get(stats, "conversions") || [];
    const punishesByPlayer = _.groupBy(punishes, "playerIndex");
    const playerPunishes = punishesByPlayer[playerIndex] || [];

    const stocks = _.get(stats, "stocks") || [];
    const stocksByOpponent = _.groupBy(stocks, "opponentIndex");
    const opponentStocks = stocksByOpponent[playerIndex] || [];

    const elements: JSX.Element[] = [];

    const addStockRows = (punish?: ConversionType) => {
      const shouldDisplayStockLoss = () => {
        // Calculates whether we should display a stock loss row in this position
        const currentStock = _.first(opponentStocks);
        if (!currentStock || currentStock.endFrame === null || currentStock.endFrame === undefined) {
          return false;
        }

        const wasLostBeforeNextPunish = !punish || currentStock.endFrame < punish.startFrame;

        return wasLostBeforeNextPunish;
      };

      let addedStockRow = false;

      // stockLossAdded is used to decide whether to display a empty state row if
      // there were no punishes for an entire stock (opponent SD'd immediately)
      // Is normally initialized false and will only trigger if two stock rows are
      // rendered one after another. but will initialize to true if we are considering
      // the very first punish, this is the handle the case where someone SD's on first
      // stock
      let shouldAddEmptyState = punish === _.first(playerPunishes);
      while (shouldDisplayStockLoss()) {
        const stock = opponentStocks.shift();

        if (!stock) {
          break;
        }
        if (shouldAddEmptyState) {
          const emptyPunishes = generateEmptyRow(stock);
          elements.push(emptyPunishes);
        }

        const stockRow = generateStockRow(stock);
        elements.push(stockRow);

        addedStockRow = true;

        // If we show two stock loss rows back to back, add an empty state in between
        shouldAddEmptyState = true;
      }

      // Special case handling when a player finishes their opponent without getting hit
      // on their last stock. Still want to show an empty state
      const stock = _.first(opponentStocks);
      if (stock && addedStockRow && !punish) {
        const emptyPunishes = generateEmptyRow(stock);
        elements.push(emptyPunishes);
      }
    };

    playerPunishes.forEach((punish) => {
      // Add stock rows to indicate when the opponent died
      addStockRows(punish);

      const punishRow = generatePunishRow(punish);
      elements.push(punishRow);
    });

    // This loop will add all remaining stocks to the end of all the punishes
    addStockRows();

    return elements;
  };

  return (
    <T.Table>
      <thead>
        {renderHeaderPlayer()}
        {renderHeaderColumns()}
      </thead>
      <tbody>{renderPunishRows()}</tbody>
    </T.Table>
  );
};
