"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Star,
  AlertTriangle,
} from "lucide-react";
import { formatCurrency } from "@/utils/formatNumbers";

const TickerStats = ({ trades }) => {
  const [tickerStats, setTickerStats] = useState(null);

  useEffect(() => {
    if (!trades || trades.length === 0) {
      setTickerStats(null);
      return;
    }

    const stats = calculateTickerStats(trades);
    setTickerStats(stats);
  }, [trades]);

  const calculateTickerStats = (trades) => {
    if (!trades.length) return null;

    const tickerData = {};

    // Process all trades by ticker
    trades.forEach((trade) => {
      const symbol = trade.symbol;
      if (!tickerData[symbol]) {
        tickerData[symbol] = {
          symbol,
          trades: [],
          totalPnL: 0,
          winTrades: 0,
          lossTrades: 0,
          totalVolume: 0,
          totalFees: 0,
          longTrades: 0,
          shortTrades: 0,
        };
      }

      tickerData[symbol].trades.push(trade);
      tickerData[symbol].totalPnL += trade.pnl || 0;
      tickerData[symbol].totalVolume +=
        Math.abs(trade.quantity * trade.price) || 0;
      tickerData[symbol].totalFees += trade.fees || 0;

      if (trade.pnl > 0) tickerData[symbol].winTrades++;
      if (trade.pnl < 0) tickerData[symbol].lossTrades++;

      if (trade.direction === "long") tickerData[symbol].longTrades++;
      if (trade.direction === "short") tickerData[symbol].shortTrades++;
    });

    // Calculate additional metrics
    Object.values(tickerData).forEach((ticker) => {
      ticker.totalTrades = ticker.trades.length;
      ticker.winRate =
        ticker.totalTrades > 0
          ? (ticker.winTrades / ticker.totalTrades) * 100
          : 0;
      ticker.averagePnL =
        ticker.totalTrades > 0 ? ticker.totalPnL / ticker.totalTrades : 0;
      ticker.profitFactor =
        ticker.lossTrades > 0
          ? (ticker.winTrades * Math.abs(ticker.averagePnL)) /
              (ticker.lossTrades * Math.abs(ticker.averagePnL)) || 1
          : ticker.winTrades > 0
            ? Infinity
            : 0;
    });

    // Find best and worst performers
    const tickers = Object.values(tickerData);
    const bestPerformer = [...tickers].sort(
      (a, b) => b.totalPnL - a.totalPnL
    )[0];
    const worstPerformer = [...tickers].sort(
      (a, b) => a.totalPnL - b.totalPnL
    )[0];
    const highestWinRate = [...tickers].sort(
      (a, b) => b.winRate - a.winRate
    )[0];
    const mostTraded = [...tickers].sort(
      (a, b) => b.totalTrades - a.totalTrades
    )[0];

    // Calculate consistency (lowest PnL standard deviation)
    const consistentPerformer = [...tickers].sort((a, b) => {
      const aStdDev = calculatePnLStdDev(a.trades);
      const bStdDev = calculatePnLStdDev(b.trades);
      return aStdDev - bStdDev;
    })[0];

    return {
      bestPerformer,
      worstPerformer,
      highestWinRate,
      mostTraded,
      consistentPerformer,
      totalTickers: tickers.length,
      tickers,
    };
  };

  const calculatePnLStdDev = (trades) => {
    if (trades.length < 2) return 0;
    const pnls = trades.map((t) => t.pnl || 0);
    const mean = pnls.reduce((a, b) => a + b, 0) / pnls.length;
    const squareDiffs = pnls.map((pnl) => Math.pow(pnl - mean, 2));
    const avgSquareDiff =
      squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    return Math.sqrt(avgSquareDiff);
  };

  const formatPercent = (value) => {
    return `${value.toFixed(1)}%`;
  };

  if (!trades || trades.length === 0) {
    return (
      <div className="otherStats flexClm gap_24">
        <div className="chart_boxBg flex_center pad_16">
          <span className="font_12 shade_50">No trade data available</span>
        </div>
      </div>
    );
  }

  if (!tickerStats) {
    return (
      <div className="otherStats flexClm gap_24 pad_16">
        <span className="font_12">Ticker Performance</span>
        <div className="chart_boxBg flex_center">
          <span className="font_12">Loading ticker stats...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="otherStats dashboardWide flexClm gap_24">
      <div className="flexClm gap_24">
        {/* 🔹 Total Tickers & Most Traded */}
        <div className="bestTime flexRow flexRow_stretch gap_12">
          <div
            className="chart_boxBg width100 flexClm gap_12"
            style={{ padding: "16px" }}
          >
            <span className="font_12">Total Tickers</span>
            <div className="flexRow flexRow_stretch">
              <span className="font_16">{tickerStats.totalTickers}</span>
            </div>
          </div>

          <div
            className="chart_boxBg width100 flexClm gap_12"
            style={{ padding: "16px" }}
          >
            <span className="font_12">Most Traded</span>
            <div className="flexRow flexRow_stretch">
              <span className="font_16">
                {tickerStats.mostTraded?.symbol || "N/A"}
              </span>
              <span className="font_12 shade_50">
                ({tickerStats.mostTraded?.totalTrades || 0})
              </span>
            </div>
          </div>
        </div>
        {/* 🔹 Best & Worst Performers */}
        <div className="bestTime flexRow flexRow_stretch gap_12">
          {/* Best Performer */}
          <div
            className="chart_boxBg width100 flexClm gap_12"
            style={{ padding: "16px" }}
          >
            <div className="flexRow gap_8">
              <span className="font_12">Best Performer</span>
            </div>
            <div className="flexRow flexRow_stretch">
              <span className="font_16 success">
                {tickerStats.bestPerformer?.symbol || "N/A"}
              </span>
            </div>
            <div className="flexRow flexRow_stretch">
              <span className="font_12 success">
                {tickerStats.bestPerformer
                  ? formatCurrency(tickerStats.bestPerformer.totalPnL)
                  : "-"}
              </span>
              <span className="font_12 shade_50">
                {tickerStats.bestPerformer
                  ? formatPercent(tickerStats.bestPerformer.winRate)
                  : ""}
              </span>
            </div>
          </div>

          {/* Worst Performer */}
          <div
            className="chart_boxBg width100 flexClm gap_12"
            style={{ padding: "16px" }}
          >
            <div className="flexRow gap_8">
              <span className="font_12">Worst Performer</span>
            </div>
            <div className="flexRow flexRow_stretch">
              <span className="font_16 error">
                {tickerStats.worstPerformer?.symbol || "N/A"}
              </span>
            </div>
            <div className="flexRow flexRow_stretch">
              <span className="font_12 error">
                {tickerStats.worstPerformer
                  ? formatCurrency(tickerStats.worstPerformer.totalPnL)
                  : "-"}
              </span>
              <span className="font_12 shade_50">
                {tickerStats.worstPerformer
                  ? formatPercent(tickerStats.worstPerformer.winRate)
                  : ""}
              </span>
            </div>
          </div>
        </div>
        {/* 🔹 Highest Win Rate & Most Consistent */}
        <div className="bestTime flexRow flexRow_stretch gap_12">
          <div
            className="chart_boxBg width100 flexClm gap_12"
            style={{ padding: "16px" }}
          >
            <div className="flexRow gap_8">
              <TrendingUp size={14} className="success" />
              <span className="font_12">Highest Win Rate</span>
            </div>
            <div className="flexRow flexRow_stretch">
              <span className="font_16">
                {tickerStats.highestWinRate?.symbol || "N/A"}
              </span>
            </div>
            <div className="flexRow flexRow_stretch">
              <span className="font_12 success">
                {tickerStats.highestWinRate
                  ? formatPercent(tickerStats.highestWinRate.winRate)
                  : "-"}
              </span>
              <span className="font_12 shade_50">
                {tickerStats.highestWinRate?.totalTrades || 0} trades
              </span>
            </div>
          </div>

          <div
            className="chart_boxBg width100 flexClm gap_12"
            style={{ padding: "16px" }}
          >
            <div className="flexRow gap_8">
              <TrendingDown size={14} className="warning" />
              <span className="font_12">Most Consistent</span>
            </div>
            <div className="flexRow flexRow_stretch">
              <span className="font_16">
                {tickerStats.consistentPerformer?.symbol || "N/A"}
              </span>
            </div>
            <div className="flexRow flexRow_stretch">
              <span
                className={`font_12 ${
                  tickerStats.consistentPerformer?.totalPnL >= 0
                    ? "success"
                    : "error"
                }`}
              >
                {tickerStats.consistentPerformer
                  ? formatCurrency(tickerStats.consistentPerformer.totalPnL)
                  : "-"}
              </span>
              <span className="font_12 shade_50">
                {tickerStats.consistentPerformer?.totalTrades || 0} trades
              </span>
            </div>
          </div>
        </div>{" "}
        {/* 🔹 Trading Style Analysis */}
        <div className="bestTime flexRow flexRow_stretch gap_12">
          <div
            className="chart_boxBg width100 flexClm gap_12"
            style={{ padding: "16px" }}
          >
            <span className="font_12">Best Long</span>
            <div className="flexRow flexRow_stretch">
              <span className="font_16">
                {tickerStats.tickers
                  .filter((t) => t.longTrades > 0)
                  .sort((a, b) => b.totalPnL - a.totalPnL)[0]?.symbol || "N/A"}
              </span>
            </div>
            {/* <div className="flexRow flexRow_stretch">
              <ArrowUpRight size={14} className="success" />
              <span className="font_12 shade_50">Long Positions</span>
            </div> */}
          </div>

          <div
            className="chart_boxBg width100 flexClm gap_12"
            style={{ padding: "16px" }}
          >
            <span className="font_12">Best Short</span>
            <div className="flexRow flexRow_stretch">
              <span className="font_16">
                {tickerStats.tickers
                  .filter((t) => t.shortTrades > 0)
                  .sort((a, b) => b.totalPnL - a.totalPnL)[0]?.symbol || "N/A"}
              </span>
            </div>
            {/* <div className="flexRow flexRow_stretch">
              <ArrowDownRight size={14} className="error" />
              <span className="font_12 shade_50">Short Positions</span>
            </div> */}
          </div>
        </div>
      </div>
      {/* 🔹 Ticker Performance Summary */}
      <div
        className="performanceSummary chart_boxBg"
        style={{
          padding: "16px",
          background: "var(--base-bg)",
          border: "1px solid var(--white-20)",
          borderRadius: "12px",
        }}
      >
        <span className="font_12 shade_50">Performance Summary</span>

        <table className="summaryTable">
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Symbol</th>
              <th style={{ textAlign: "left" }}>PnL</th>
              <th style={{ textAlign: "left" }}>Win Rate</th>
            </tr>
          </thead>

          <tbody>
            {tickerStats.tickers.slice(0, 10).map((ticker, index) => (
              <tr key={ticker.symbol}>
                <td className={index < 3 ? "font_weight_600" : ""}>
                  {ticker.symbol}
                </td>
                <td
                  className={ticker.totalPnL >= 0 ? "" : ""}
                  style={{ textAlign: "left", color: "var(--success)" }}
                >
                  {formatCurrency(ticker.totalPnL)}
                </td>
                <td
                  className={ticker.winRate >= 50 ? "" : ""}
                  style={{ textAlign: "left", color: "var(--success)" }}
                >
                  {formatPercent(ticker.winRate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {tickerStats.tickers.length > 10 && (
          <div className="flexRow flexRow_center marg_top_12">
            <span className="font_12 shade_50">
              +{tickerStats.tickers.length - 10} more tickers
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TickerStats;
