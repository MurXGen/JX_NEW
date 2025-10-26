"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/utils/formatNumbers";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MIN_TICKERS = 5;
const TICKER_WINDOW = 8; // number of tickers to show per page

const TickerAnalysis = ({ trades }) => {
  const [visibleData, setVisibleData] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [processedData, setProcessedData] = useState([]);
  const [tickerMap, setTickerMap] = useState({});

  // Process ticker data
  useEffect(() => {
    if (!trades || trades.length === 0) return;

    const tickerData = {};

    trades.forEach((t) => {
      if (!tickerData[t.symbol]) {
        tickerData[t.symbol] = {
          count: 0,
          pnl: 0,
          wins: 0,
          losses: 0,
        };
      }
      tickerData[t.symbol].count++;
      tickerData[t.symbol].pnl += t.pnl || 0;

      if (t.pnl > 0) tickerData[t.symbol].wins++;
      if (t.pnl < 0) tickerData[t.symbol].losses++;
    });

    setTickerMap(tickerData);

    // Convert to array and sort by PnL (highest first)
    let processed = Object.entries(tickerData)
      .map(([symbol, data]) => ({
        symbol,
        count: data.count,
        pnl: data.pnl,
        wins: data.wins,
        losses: data.losses,
        winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
        isPositive: data.pnl >= 0,
      }))
      .sort((a, b) => b.pnl - a.pnl); // Sort by PnL descending

    // Add padding if needed
    if (processed.length < MIN_TICKERS) {
      const padCount = MIN_TICKERS - processed.length;
      for (let i = 0; i < padCount; i++) {
        processed.push({
          symbol: `TICKER_${i + 1}`,
          count: 0,
          pnl: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          isPositive: true,
          isPadding: true,
        });
      }
    }

    setProcessedData(processed);

    // Start from first tickers
    const startIndex = 0;
    setCurrentIndex(startIndex);
    setVisibleData(processed.slice(startIndex, startIndex + TICKER_WINDOW));
  }, [trades]);

  // Handle pagination
  const handlePrev = () => {
    const newIndex = Math.max(currentIndex - TICKER_WINDOW, 0);
    setCurrentIndex(newIndex);
    setVisibleData(processedData.slice(newIndex, newIndex + TICKER_WINDOW));
  };

  const handleNext = () => {
    const newIndex = Math.min(
      currentIndex + TICKER_WINDOW,
      Math.max(processedData.length - TICKER_WINDOW, 0)
    );
    setCurrentIndex(newIndex);
    setVisibleData(processedData.slice(newIndex, newIndex + TICKER_WINDOW));
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      const data = payload[0].payload;

      if (data.isPadding) {
        return (
          <div className="boxBg tooltip font_12 flexClm gap_8">
            <div className="font_12" style={{ color: "var(--white-50)" }}>
              No data available
            </div>
          </div>
        );
      }

      return (
        <div className="boxBg tooltip font_12 flexClm gap_12">
          <div className="tooltip-header">
            <strong>{data.symbol}</strong>
          </div>
          <div className="flexClm gap_6">
            <span className="flexRow flexRow_stretch width100">
              <span>Total PnL:</span>
              <span className={data.isPositive ? "success" : "error"}>
                {formatCurrency(data.pnl)}
              </span>
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
              <span>Wins/Losses:</span>
              <span>
                {data.wins}W / {data.losses}L
              </span>
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomBar = (props) => {
    const { x, y, width, height, payload } = props;

    if (payload.isPadding) {
      return (
        <rect
          x={x}
          y={y}
          width={width}
          height={Math.max(height, 2)}
          fill="var(--white-10)"
          rx={4}
          ry={4}
          opacity={0.3}
        />
      );
    }

    const isPositive = payload.pnl >= 0;
    const fillColor = isPositive ? "#22C55E" : "#EF4444";

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={Math.max(height, 2)}
          fill={fillColor}
          rx={4}
          ry={4}
          opacity={0.8}
        />

        {/* Trade count badge on bar */}
        {height > 20 && (
          <text
            x={x + width / 2}
            y={y + height / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="10"
            fill="#ffffff"
            fontWeight="600"
          >
            {payload.count}
          </text>
        )}
      </g>
    );
  };

  if (!trades || trades.length === 0) {
    return (
      <div className="flexClm gap_32 chart_boxBg pad_16">
        <div className="section-header">
          <span className="font_16 font_weight_600">Ticker Analysis</span>
          <span className="font_12" style={{ color: "var(--white-50)" }}>
            Performance by trading symbol
          </span>
        </div>
        <div className="flex_center">
          <div className="font_14 shade_50">
            No trades available for analysis
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className=" flexClm gap_16 chart_boxBg pad_16">
      {/* Header */}
      <div className="flexRow flexRow_stretch">
        <div className="flexClm">
          <span className="font_14">Ticker Analysis</span>
        </div>
      </div>

      <div className="flexRow flexRow_stretch">
        {/* Summary Stats */}

        <div className="flexClm gap_16 width100 boxBg">
          <span className="font_12" style={{ color: "var(--white-50)" }}>
            Tickers
          </span>
          <span className="font_16 font_weight_600">
            {Object.keys(tickerMap).length}
          </span>
        </div>
        <div className="flexClm gap_4 width100 boxBg">
          <span className="font_12" style={{ color: "var(--white-50)" }}>
            Total Trades
          </span>
          <span className="font_16 font_weight_600">{trades.length}</span>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="flexRow flexRow_stretch font_12">
        <button
          onClick={handlePrev}
          className="button_ter flexRow"
          disabled={currentIndex === 0}
        >
          <ChevronLeft size={16} />
        </button>
        <div className="font_12" style={{ color: "var(--white-50)" }}>
          Showing {currentIndex + 1}-
          {Math.min(currentIndex + TICKER_WINDOW, processedData.length)} of{" "}
          {processedData.length} tickers
        </div>

        <button
          onClick={handleNext}
          className="button_ter flexRow"
          disabled={currentIndex + TICKER_WINDOW >= processedData.length}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Chart */}
      <div className="chart_container">
        <ResponsiveContainer width="100%" height="200">
          <BarChart
            data={visibleData}
            margin={{ top: 20, right: 10, left: 10, bottom: 30 }}
            barSize={32}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#374151"
              opacity={0.3}
              horizontal={true}
              vertical={false}
            />

            <XAxis
              dataKey="symbol"
              tick={{ fontSize: 11, fill: "#ccc" }}
              angle={-0}
              textAnchor="middle"
              height={10}
            />

            <YAxis
              tick={{ fontSize: 11, fill: "#ccc" }}
              tickFormatter={(value) => formatCurrency(value)}
              width={60}
            />

            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "#ffffff10" }}
            />

            <Bar dataKey="pnl" shape={CustomBar} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TickerAnalysis;
