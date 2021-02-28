import { GlobalStats } from "common/game";
import * as timeUtils from "common/time";
import React from "react";

import * as T from "../ReplayFileStats/TableStyles";

export function toOrdinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function formatPercent(n: number, fractionalDigits: number | 2) {
  return `${(n * 100).toFixed(fractionalDigits)}%`;
}

const columnCount = 3;

export interface GlobalTableProps {
  stats: GlobalStats;
}

export const GlobalTable: React.FC<GlobalTableProps> = ({ stats }) => {
  const renderStatField = (header: string, value: number | string) => {
    const key = `standard-field-${header}`;
    return (
      <T.TableRow key={key}>
        <T.TableCell>{header}</T.TableCell>
        <T.TableCell>{value}</T.TableCell>
      </T.TableRow>
    );
  };

  const renderRatioStatField = (header: string, value: number, total: number) => {
    const key = `standard-field-${header}`;

    return (
      <T.TableRow key={key}>
        <T.TableCell>{header}</T.TableCell>
        <T.TableCell>
          <div>
            <div>
              {value} ({formatPercent(value / total, 2)})
            </div>
          </div>
        </T.TableCell>
      </T.TableRow>
    );
  };

  const renderOverallSection = () => {
    return [
      <thead key="overall-header">
        <tr>
          <T.TableSubHeaderCell colSpan={columnCount}>Overall</T.TableSubHeaderCell>
        </tr>
      </thead>,
      <tbody key="overall-body">
        {renderStatField("Games Played", stats.count)}
        {renderRatioStatField("Games Won", stats.wins, stats.count)}
        {renderStatField("Opponents Played", Object.keys(stats.opponents).length)}
        {renderStatField("Average Games / Opponent", (stats.count / Object.keys(stats.opponents).length).toFixed(2))}
        {renderStatField("Total Play Time", timeUtils.convertFrameCountToDurationString(stats.time))}
      </tbody>,
    ];
  };

  const renderOffenseSection = () => {
    return [
      <thead key="offense-header">
        <tr>
          <T.TableSubHeaderCell colSpan={columnCount}>Offsense</T.TableSubHeaderCell>
        </tr>
      </thead>,
      <tbody key="offsense-body">
        {renderStatField("Total Kills", `${stats.kills.toLocaleString(undefined, { maximumFractionDigits: 0 })}`)}
        {renderStatField("Total Deaths", `${stats.deaths.toLocaleString(undefined, { maximumFractionDigits: 0 })}`)}
        {renderStatField(
          "Total Damage Done",
          `${stats.damageDone.toLocaleString(undefined, { maximumFractionDigits: 0 })}%`,
        )}
        {renderStatField(
          "Total Damage Received",
          `${stats.damageReceived.toLocaleString(undefined, { maximumFractionDigits: 0 })}%`,
        )}
        {renderStatField("Average Opening Conversion Rate", formatPercent(stats.conversionRate, 2))}
        {renderStatField("Average Openings / Kill", stats.openingsPerKill.toFixed(2))}
        {renderStatField("Average Damage / Opening", stats.damagePerOpening.toFixed(2))}
      </tbody>,
    ];
  };

  const renderNeutralSection = () => {
    return [
      <thead key="neutral-header">
        <tr>
          <T.TableSubHeaderCell colSpan={columnCount}>Neutral</T.TableSubHeaderCell>
        </tr>
      </thead>,
      <tbody key="neutral-body">{renderStatField("Neutral Winrate", formatPercent(stats.neutralWinRatio, 2))}</tbody>,
    ];
  };

  const renderGeneralSection = () => {
    return [
      <thead key="general-header">
        <tr>
          <T.TableSubHeaderCell colSpan={columnCount}>General</T.TableSubHeaderCell>
        </tr>
      </thead>,
      <tbody key="general-body">
        {renderStatField("Inputs / Minute", stats.inputsPerMinute.toFixed(0))}
        {renderStatField("Digital Inputs / Minute", stats.digitalInputsPerMinute.toFixed(0))}
      </tbody>,
    ];
  };

  return (
    <T.Table>
      {renderOverallSection()}
      {renderOffenseSection()}
      {renderNeutralSection()}
      {renderGeneralSection()}
    </T.Table>
  );
};
