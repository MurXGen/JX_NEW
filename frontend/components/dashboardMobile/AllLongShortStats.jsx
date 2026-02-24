"use client";
import { useMemo } from "react";
import { formatCurrency, formatNumber } from "@/utils/formatNumbers";

export default function AllLongShortStats({
  trades = [],
  currencySymbol = "$",
}) {
  /* 🔥 Separate long & short trades */
  const { longTrades, shortTrades } = useMemo(() => {
    const longs = [];
    const shorts = [];

    trades.forEach((t) => {
      if (t.direction?.toLowerCase() === "long") longs.push(t);
      if (t.direction?.toLowerCase() === "short") shorts.push(t);
    });

    return { longTrades: longs, shortTrades: shorts };
  }, [trades]);

  /* 🔥 Helper: Win/Loss split */
  const getWinLoss = (arr) => {
    let won = 0;
    let lost = 0;

    arr.forEach((t) => {
      if (t.pnl > 0) won++;
      if (t.pnl < 0) lost++;
    });

    return { won, lost };
  };

  const longWinLoss = getWinLoss(longTrades);
  const shortWinLoss = getWinLoss(shortTrades);

  /* 🔥 Growth Rate */
  const getGrowthRate = (arr) => {
    if (!arr.length) return 0;
    const wins = arr.filter((t) => t.pnl > 0).length;
    return ((wins / arr.length) * 100).toFixed(2);
  };

  const longGrowth = getGrowthRate(longTrades);
  const shortGrowth = getGrowthRate(shortTrades);

  /* 🔥 Average PnL */
  const getAvgPnL = (arr) => {
    if (!arr.length) return 0;
    const sum = arr.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
    return (sum / arr.length).toFixed(2);
  };

  const avgLongPnL = getAvgPnL(longTrades);
  const avgShortPnL = getAvgPnL(shortTrades);

  /* 🔥 Best/Worst Time per Direction */
  const getBestWorstTime = (arr) => {
    const timeRanges = {
      "00AM-06AM": 0,
      "06AM-12PM": 0,
      "12PM-06PM": 0,
      "06PM-12AM": 0,
    };

    arr.forEach((trade) => {
      if (!trade.closeTime) return;

      const hour = new Date(trade.closeTime).getHours();

      if (hour < 6) timeRanges["00AM-06AM"] += trade.pnl || 0;
      else if (hour < 12) timeRanges["06AM-12PM"] += trade.pnl || 0;
      else if (hour < 18) timeRanges["12PM-06PM"] += trade.pnl || 0;
      else timeRanges["06PM-12AM"] += trade.pnl || 0;
    });

    const entries = Object.entries(timeRanges);

    const best = entries.reduce((a, b) => (b[1] > a[1] ? b : a), ["-", 0]);
    const worst = entries.reduce((a, b) => (b[1] < a[1] ? b : a), ["-", 0]);

    return {
      best: best[1] > 0 ? best[0] : "N/A",
      worst: worst[1] < 0 ? worst[0] : "N/A",
    };
  };

  const longTime = getBestWorstTime(longTrades);
  const shortTime = getBestWorstTime(shortTrades);

  /* 🔥 Hold Duration (avg minutes) */
  const getAvgHold = (arr) => {
    if (!arr.length) return 0;

    const totalMinutes = arr.reduce((sum, t) => {
      if (!t.openTime || !t.closeTime) return sum;

      const open = new Date(t.openTime);
      const close = new Date(t.closeTime);
      return sum + (close - open) / 60000;
    }, 0);

    return (totalMinutes / arr.length).toFixed(1);
  };

  const longHold = getAvgHold(longTrades);
  const shortHold = getAvgHold(shortTrades);

  /* 🔥 Suitable Bias */
  const suitable =
    Number(longGrowth) > Number(shortGrowth)
      ? "Longs"
      : Number(shortGrowth) > Number(longGrowth)
        ? "Shorts"
        : "Balanced";

  return (
    <div className="flexClm">
      <div className="analytics">
        <div className="overall">
          <div className="stats-card radius-12">
            <span className="card-label">Long Won / Lost</span>
            <span className="card-value">
              {formatNumber(longWinLoss?.won || 0, 0)} /{" "}
              {formatNumber(longWinLoss?.lost || 0, 0)}
            </span>
          </div>

          <div className="stats-card radius-12">
            <span className="card-label">Short Won / Lost</span>
            <span className="card-value">
              {formatNumber(shortWinLoss?.won || 0, 0)} /{" "}
              {formatNumber(shortWinLoss?.lost || 0, 0)}
            </span>
          </div>

          <div className="stats-card radius-12">
            <span className="card-label">Best Long Time</span>
            <span className="card-value">{longTime?.best || "-"}</span>
          </div>

          <div className="stats-card radius-12">
            <span className="card-label">Best Short Time</span>
            <span className="card-value">{shortTime?.best || "-"}</span>
          </div>

          <div className="stats-card radius-12">
            <span className="card-label">Worst Long Time</span>
            <span className="card-value">{longTime?.worst || "-"}</span>
          </div>

          <div className="stats-card radius-12">
            <span className="card-label">Worst Short Time</span>
            <span className="card-value">{shortTime?.worst || "-"}</span>
          </div>

          <div className="stats-card radius-12">
            <span className="card-label">Avg Long PnL</span>
            <span className="card-value">
              {formatCurrency(avgLongPnL || 0, currencySymbol)}
            </span>
          </div>

          <div className="stats-card radius-12">
            <span className="card-label">Avg Short PnL</span>
            <span className="card-value">
              {formatCurrency(avgShortPnL || 0, currencySymbol)}
            </span>
          </div>

          <div className="stats-card radius-12">
            <span className="card-label">Long Growth</span>
            <span className="card-value">
              {formatNumber(longGrowth || 0, 2)}%
            </span>
          </div>

          <div className="stats-card radius-12">
            <span className="card-label">Short Growth</span>
            <span className="card-value">
              {formatNumber(shortGrowth || 0, 2)}%
            </span>
          </div>

          <div className="stats-card radius-12">
            <span className="card-label">Avg Long Hold</span>
            <span className="card-value">
              {formatNumber(longHold || 0, 0)} min
            </span>
          </div>

          <div className="stats-card radius-12">
            <span className="card-label">Avg Short Hold</span>
            <span className="card-value">
              {formatNumber(shortHold || 0, 0)} min
            </span>
          </div>

          <div className="stats-card radius-12">
            <span className="card-label">Best Performance</span>
            <span className="card-value">{suitable || "-"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
