"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  YAxis,
  Cell,
  LabelList,
} from "recharts";
import { formatCurrency } from "@/utils/formatNumbers";
import { ChevronLeft, ChevronRight } from "lucide-react";

const TICKER_WINDOW = 8; // number of tickers to show per page

const TickerAnalysis = ({ trades }) => {
  const [visibleData, setVisibleData] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [processedData, setProcessedData] = useState([]);
  const [tickerMap, setTickerMap] = useState({});

  // Process ticker data - only real tickers
  const realTickerData = useMemo(() => {
    if (!trades || trades.length === 0) return [];

    const tickerData = {};

    trades.forEach((t) => {
      if (!t.symbol || t.symbol.trim() === "") return;

      const symbol = t.symbol.trim();
      if (!tickerData[symbol]) {
        tickerData[symbol] = {
          count: 0,
          pnl: 0,
          wins: 0,
          losses: 0,
          breakEven: 0,
        };
      }
      tickerData[symbol].count++;
      tickerData[symbol].pnl += t.pnl || 0;

      if (t.pnl > 0) tickerData[symbol].wins++;
      else if (t.pnl < 0) tickerData[symbol].losses++;
      else tickerData[symbol].breakEven++;
    });

    setTickerMap(tickerData);

    // Convert to array and sort by absolute PnL (highest magnitude first)
    return Object.entries(tickerData)
      .map(([symbol, data]) => ({
        symbol,
        count: data.count,
        pnl: data.pnl,
        wins: data.wins,
        losses: data.losses,
        breakEven: data.breakEven,
        winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
        isPositive: data.pnl >= 0,
      }))
      .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl)); // Sort by absolute PnL descending
  }, [trades]);

  // Update processed data and visible data
  useEffect(() => {
    if (realTickerData.length === 0) {
      setProcessedData([]);
      setVisibleData([]);
      setCurrentIndex(0);
      return;
    }

    setProcessedData(realTickerData);

    // Start from first tickers
    const startIndex = 0;
    setCurrentIndex(startIndex);
    setVisibleData(
      realTickerData.slice(startIndex, startIndex + TICKER_WINDOW),
    );
  }, [realTickerData]);

  // Handle pagination
  const handlePrev = () => {
    const newIndex = Math.max(currentIndex - TICKER_WINDOW, 0);
    setCurrentIndex(newIndex);
    setVisibleData(processedData.slice(newIndex, newIndex + TICKER_WINDOW));
  };

  const handleNext = () => {
    const newIndex = Math.min(
      currentIndex + TICKER_WINDOW,
      Math.max(processedData.length - TICKER_WINDOW, 0),
    );
    setCurrentIndex(newIndex);
    setVisibleData(processedData.slice(newIndex, newIndex + TICKER_WINDOW));
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      const data = payload[0].payload;

      let pnlClass = "neutral";
      if (data.pnl > 0) pnlClass = "positive";
      else if (data.pnl < 0) pnlClass = "negative";

      return (
        <div className="boxBg tooltip font_12 flexClm gap_12">
          <div className="pnl-tooltip-header">
            <strong>{data.symbol}</strong>
          </div>

          <div className="flexClm gap_6">
            <span className="flexRow flexRow_stretch width100">
              <span>Total PnL:</span>
              <span className={`${pnlClass}`}>{formatCurrency(data.pnl)}</span>
            </span>
            <span className="flexRow flexRow_stretch width100">
              <span>Total Trades:</span>
              <span>{data.count}</span>
            </span>
            <span className="flexRow flexRow_stretch width100">
              <span>Win Rate:</span>
              <span>{data.winRate.toFixed(1)}%</span>
            </span>
            <span className="flexRow flexRow_stretch width100">
              <span>W/L/BE:</span>
              <span>
                {data.wins}W / {data.losses}L / {data.breakEven}BE
              </span>
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate max and min PnL for label display
  const maxPnl = useMemo(() => {
    return visibleData.length > 0
      ? Math.max(...visibleData.map((d) => d.pnl))
      : 0;
  }, [visibleData]);

  const minPnl = useMemo(() => {
    return visibleData.length > 0
      ? Math.min(...visibleData.map((d) => d.pnl))
      : 0;
  }, [visibleData]);

  if (!trades || trades.length === 0) {
    return (
      <div
        className="stats-card radius-12 flexClm flex_center"
        style={{
          height: "40vh",
          padding: "20px",
          textAlign: "center",
        }}
      >
        <div
          className="flexClm gap_16 flex_center"
          style={{
            maxWidth: "320px",
            width: "100%",
          }}
        >
          {/* GIF */}
          <img
            src="/assets/chart-analysis-area.gif"
            alt="No Trades"
            width={140}
            height={140}
            style={{ objectFit: "contain" }}
          />

          {/* Heading */}
          <span className="font_16 ">
            Log trade to compute <br /> Ticker analysis
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="stats-card chart_container radius-12">
      <span className="card-value">Ticker analysis</span>
      {/* <div className="flexRow flexRow_stretch gap_12"> */}
      {/* Summary Stats */}
      {/* <div className="flexClm gap_8 width100 boxBg pad_12">
          <span className="font_12" style={{ color: "var(--white-50)" }}>
            Tickers
          </span>
          <span className="font_16 font_weight_600">
            {Object.keys(tickerMap).length}
          </span>
        </div> */}
      {/* <div className="flexClm gap_8 width100 boxBg pad_12">
          <span className="font_12" style={{ color: "var(--white-50)" }}>
            Total Trades
          </span>
          <span className="font_16 font_weight_600">{trades.length}</span>
        </div> */}
      {/* </div> */}

      {/* Pagination Controls - Only show if we have enough tickers */}
      {processedData.length > TICKER_WINDOW && (
        <div className="flexRow flexRow_stretch font_12 gap_8">
          <button
            onClick={handlePrev}
            className="button_ter flexRow flex_center"
            disabled={currentIndex === 0}
            style={{ padding: "8px 12px" }}
          >
            <ChevronLeft size={16} />
          </button>
          <div
            className="font_12 flex_center"
            style={{ color: "var(--white-50)", flex: 1 }}
          >
            Showing {currentIndex + 1}-
            {Math.min(currentIndex + TICKER_WINDOW, processedData.length)} of{" "}
            {processedData.length} tickers
          </div>
          <button
            onClick={handleNext}
            className="button_ter flexRow flex_center"
            disabled={currentIndex + TICKER_WINDOW >= processedData.length}
            style={{ padding: "8px 12px" }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Chart */}
      <div className="chart_container" style={{ height: "260px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={visibleData}
            barCategoryGap="30%"
            margin={{ top: 20, bottom: 20, left: 10, right: 10 }}
          >
            <defs>
              {/* Positive gradient - same as your PNLChart */}
              <linearGradient id="tickerGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22C55E" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#22C55E80" stopOpacity={0.5} />
              </linearGradient>
              {/* Negative gradient - same as your PNLChart */}
              <linearGradient id="tickerNegative" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#EF444480" stopOpacity={0.5} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="symbol"
              tick={({ x, y, payload }) => (
                <text
                  x={x}
                  y={y + 16}
                  textAnchor="middle"
                  fill="var(--black)" // ← CSS variable
                  fontSize={12}
                >
                  {payload.value}
                </text>
              )}
            />

            <YAxis
              hide
              domain={[
                (dataMin) => {
                  const min = Math.min(0, dataMin * 1.2);
                  return min;
                },
                (dataMax) => {
                  const max = Math.max(0, dataMax * 1.2);
                  return max;
                },
              ]}
            />

            <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="3 3" />

            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "#ffffff10" }}
            />

            <Bar dataKey="pnl" radius={[12, 12, 0, 0]}>
              {visibleData.map((entry, i) => (
                <Cell
                  key={`cell-${i}`}
                  fill={
                    entry.pnl >= 0
                      ? "url(#tickerGradient)"
                      : "url(#tickerNegative)"
                  }
                />
              ))}

              {/* Show PnL labels for max and min values */}
              <LabelList
                dataKey="pnl"
                position="top"
                className="font_10"
                fill="#ffffff"
                fontSize={10}
                fontWeight="500"
                offset={5}
                formatter={(val) => {
                  // Only show label for max and min values, or values above/below certain thresholds
                  const isSignificant =
                    Math.abs(val) >=
                    Math.max(Math.abs(maxPnl), Math.abs(minPnl)) * 0.5;
                  if (isSignificant) {
                    return formatCurrency(val);
                  }
                  return "";
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      {/* <div className="flexRow flex_center gap_16 font_12">
        <div className="flexRow gap_4 flex_center">
          <div
            className="legend_indicator"
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "3px",
              background: "url(#tickerGradient)",
              backgroundSize: "cover",
            }}
          ></div>
          <span>Profitable</span>
        </div>
        <div className="flexRow gap_4 flex_center">
          <div
            className="legend_indicator"
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "3px",
              background: "url(#tickerNegative)",
              backgroundSize: "cover",
            }}
          ></div>
          <span>Loss</span>
        </div>
      </div> */}
    </div>
  );
};

export default TickerAnalysis;
