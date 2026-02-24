"use client";
import { useMemo } from "react";
import { formatCurrency, formatNumber } from "@/utils/formatNumbers";

export default function AllTradeStats({
  stats,
  trades = [],
  currencySymbol = "$",
}) {
  /* 🔥 Sort trades by closeTime DESC (most recent first) */
  const sortedTrades = useMemo(() => {
    return [...trades]
      .filter((t) => t.closeTime)
      .sort((a, b) => new Date(b.closeTime) - new Date(a.closeTime));
  }, [trades]);

  /* 🔥 Proper consecutive streak logic */
  const streakData = useMemo(() => {
    if (!sortedTrades.length) return { count: 0, type: "" };

    let firstTrade = sortedTrades[0];
    let type =
      firstTrade.pnl > 0
        ? "Wins"
        : firstTrade.pnl < 0
          ? "Losses"
          : "Break-even";

    let count = 0;

    for (let trade of sortedTrades) {
      if (
        (type === "Wins" && trade.pnl > 0) ||
        (type === "Losses" && trade.pnl < 0) ||
        (type === "Break-even" && trade.pnl === 0)
      ) {
        count++;
      } else {
        break;
      }
    }

    return { count, type };
  }, [sortedTrades]);

  /* 🔥 Total Long / Short */
  const directionStats = useMemo(() => {
    let long = 0;
    let short = 0;

    trades.forEach((t) => {
      if (t.direction?.toLowerCase() === "long") long++;
      if (t.direction?.toLowerCase() === "short") short++;
    });

    return { long, short };
  }, [trades]);

  /* 🔥 Growth Rate (Win ratio %) */
  const growthRate = stats?.winRatio || 0;

  return (
    <div className="flexClm">
      <div className="analytics">
        <div className="overall">
          <div className="stats-card radius-12">
            <span className="card-label">Total Volume</span>
            <span className="card-value">
              {formatCurrency(stats.totalVolume || 0, currencySymbol)}
            </span>
          </div>

          <div className="stats-card radius-12">
            <span className="card-label">Average PnL</span>
            <span className="card-value">
              {formatCurrency(stats.averagePnL || 0, currencySymbol)}
            </span>
          </div>

          <div className="stats-card radius-12">
            <span className="card-label">Best Time</span>
            <span className="card-value">{stats.bestTime || "-"}</span>
          </div>

          <div className="stats-card radius-12">
            <span className="card-label">Worst Time</span>
            <span className="card-value">{stats.worstTime || "-"}</span>
          </div>

          <div className="stats-card radius-12">
            <span className="card-label">Total Long</span>
            <span className="card-value">
              {formatNumber(directionStats.long || 0, 0)}
            </span>
          </div>

          <div className="stats-card radius-12">
            <span className="card-label">Total Short</span>
            <span className="card-value">
              {formatNumber(directionStats.short || 0, 0)}
            </span>
          </div>

          <div className="stats-card radius-12">
            <span className="card-label">Streak</span>
            <span className="card-value">
              {streakData?.count || 0} {streakData?.type || ""}
            </span>
          </div>

          <div className="stats-card radius-12">
            <span className="card-label">Growth Rate</span>
            <span className="card-value">
              {formatNumber(growthRate || 0, 2)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
