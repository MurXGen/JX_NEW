"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { formatCurrency } from "@/utils/formatNumbers";
import { ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";

const TickerAnalysis = ({ trades }) => {
  const [selectedTickers, setSelectedTickers] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [currentChartIndex, setCurrentChartIndex] = useState(0);
  const TICKERS_PER_PAGE = 5;
  const CHART_WINDOW = 10;

  // Get unique tickers and prepare time-based data
  const tickerTimeData = useMemo(() => {
    if (!trades || trades.length === 0) return { tickers: [], timeData: [] };

    // Sort trades by date (ascending for chart)
    const sortedTrades = [...trades].sort(
      (a, b) => new Date(a.openTime) - new Date(b.openTime),
    );

    // Get unique tickers
    const uniqueTickers = [
      ...new Set(trades.map((t) => t.symbol).filter(Boolean)),
    ];

    // Initialize time series data
    const timeMap = new Map();
    let cumulativePnl = {};

    sortedTrades.forEach((trade) => {
      if (!trade.symbol) return;

      const date = new Date(trade.openTime).toISOString();

      if (!timeMap.has(date)) {
        timeMap.set(date, { date, ...cumulativePnl });
      }

      // Update cumulative PnL for this ticker
      cumulativePnl[trade.symbol] =
        (cumulativePnl[trade.symbol] || 0) + (trade.pnl || 0);

      // Update all tickers in the map for this date
      const updatedEntry = { date, ...cumulativePnl };
      timeMap.set(date, updatedEntry);
    });

    return {
      tickers: uniqueTickers,
      timeData: Array.from(timeMap.values()),
    };
  }, [trades]);

  // Initialize selected tickers and set chart to show LATEST data
  useEffect(() => {
    if (tickerTimeData.tickers.length > 0) {
      setSelectedTickers(tickerTimeData.tickers.slice(0, 3));
    }

    setChartData(tickerTimeData.timeData);

    // Set chart index to show the most recent data (last CHART_WINDOW items)
    if (tickerTimeData.timeData.length > 0) {
      const startIndex = Math.max(
        tickerTimeData.timeData.length - CHART_WINDOW,
        0,
      );
      setCurrentChartIndex(startIndex);
    }
  }, [tickerTimeData]);

  // Format date for X axis
  const formatXAxisDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" });
  };

  // Format date for tooltip
  const formatTooltipDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      weekday: "short",
    });
  };

  // Pagination for ticker selection
  const totalPages = Math.ceil(
    tickerTimeData.tickers.length / TICKERS_PER_PAGE,
  );
  const paginatedTickers = tickerTimeData.tickers.slice(
    currentPage * TICKERS_PER_PAGE,
    (currentPage + 1) * TICKERS_PER_PAGE,
  );

  // Chart pagination - show from currentChartIndex
  const visibleChartData = useMemo(() => {
    if (chartData.length === 0) return [];
    return chartData.slice(currentChartIndex, currentChartIndex + CHART_WINDOW);
  }, [chartData, currentChartIndex]);

  const handlePrevChart = () => {
    setCurrentChartIndex((prev) => Math.max(0, prev - CHART_WINDOW));
  };

  const handleNextChart = () => {
    setCurrentChartIndex((prev) =>
      Math.min(
        Math.max(chartData.length - CHART_WINDOW, 0),
        prev + CHART_WINDOW,
      ),
    );
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));
  };

  const toggleTicker = (ticker) => {
    setSelectedTickers((prev) => {
      if (prev.includes(ticker)) {
        return prev.filter((t) => t !== ticker);
      } else {
        return [...prev, ticker];
      }
    });
  };

  const selectAll = () => {
    setSelectedTickers(paginatedTickers);
  };

  // Generate colors for lines
  const getLineColor = (index, ticker) => {
    const colors = [
      "#22C55E",
      "#EF4444",
      "#3B82F6",
      "#F59E0B",
      "#8B5CF6",
      "#EC4899",
      "#14B8A6",
      "#F97316",
      "#6366F1",
      "#84CC16",
    ];
    return colors[index % colors.length];
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div className="boxBg tooltip font_12 flexClm gap_12">
          <div className="pnl-tooltip-header">{formatTooltipDate(label)}</div>
          <div className="flexClm gap_4">
            {payload.map((entry, index) => (
              <span key={index} className="flexRow flexRow_stretch width100">
                <span style={{ color: entry.color }}>{entry.name}:</span>
                <span className={entry.value >= 0 ? "success" : "error"}>
                  {formatCurrency(entry.value)}
                </span>
              </span>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

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
          style={{ maxWidth: "320px", width: "100%" }}
        >
          <img
            src="/assets/chart-analysis-area.gif"
            alt="No Trades"
            width={140}
            height={140}
            style={{ objectFit: "contain" }}
          />
          <span className="font_16">
            Log trades to see ticker performance over time
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="stats-card radius-12 flexClm gap_32">
      {/* Header with Chart Navigation */}
      <div className="flexRow flexRow_stretch">
        <div className="flexRow gap_12">
          <TrendingUp size={20} color="var(--primary)" />
          <span className="card-value">Ticker Performance</span>
        </div>
        <div className="flexRow gap_12">
          <button
            onClick={handlePrevChart}
            className="btn flexRow"
            disabled={currentChartIndex === 0}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={handleNextChart}
            className="btn flexRow"
            disabled={currentChartIndex + CHART_WINDOW >= chartData.length}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Chart Container - Matching PnL Chart Style */}
      <div className="chart_container" style={{ height: "300px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={visibleChartData}
            margin={{ top: 20, right: 0, left: 0, bottom: 0 }}
          >
            <defs>
              {/* Gradients for each line */}
              {selectedTickers.map((ticker, index) => {
                const color = getLineColor(index, ticker);
                return (
                  <linearGradient
                    key={ticker}
                    id={`line-gradient-${ticker}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.1} />
                  </linearGradient>
                );
              })}
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#374151"
              opacity={0.3}
              horizontal={true}
              vertical={false}
            />

            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: "var(--black)" }}
              tickFormatter={formatXAxisDate}
            />

            <YAxis
              tick={{ fontSize: 12, fill: "var(--black)" }}
              tickFormatter={(value) => formatCurrency(value)}
              width={60}
            />

            {/* Zero Reference Line */}
            <ReferenceLine
              y={0}
              stroke="#6b7280"
              strokeDasharray="3 3"
              opacity={0.5}
            />

            <Tooltip
              content={<CustomTooltip />}
              cursor={{
                stroke: "#6b7280",
                strokeWidth: 1,
                strokeDasharray: "3 3",
              }}
            />

            {/* Render lines for selected tickers */}
            {selectedTickers.map((ticker, index) => (
              <Line
                key={ticker}
                type="monotone"
                dataKey={ticker}
                stroke={getLineColor(index, ticker)}
                strokeWidth={2}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  const value = payload[ticker];
                  if (value === undefined) return null;

                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={3}
                      fill={value >= 0 ? "#22c55e" : "#ef4444"}
                      stroke={getLineColor(index, ticker)}
                      strokeWidth={1}
                    />
                  );
                }}
                activeDot={(props) => {
                  const { cx, cy, payload } = props;
                  const value = payload[ticker];
                  if (value === undefined) return null;

                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={5}
                      fill={value >= 0 ? "#22c55e" : "#ef4444"}
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  );
                }}
                isAnimationActive={true}
                name={ticker}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Ticker Selection Section */}
      <div
        className="flexClm gap_16"
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border-color)",
          borderRadius: "12px",
          padding: "16px",
        }}
      >
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flexRow flexRow_stretch">
            <div className="flexRow gap_8">
              <button
                onClick={handlePrevPage}
                className="btn flexRow"
                disabled={currentPage === 0}
              >
                <ChevronLeft size={16} />
              </button>
              <span
                className="font_12"
                style={{ color: "var(--text-secondary)" }}
              >
                Page {currentPage + 1} of {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                className="btn flexRow"
                disabled={currentPage === totalPages - 1}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Quick Actions */}
            <button
              onClick={selectAll}
              className="btn"
              style={{
                background: "var(--primary-10)",
                color: "var(--primary)",
                border: "1px solid var(--primary-20)",
              }}
            >
              Select All
            </button>
          </div>
        )}

        {/* Ticker Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
            gap: "8px",
          }}
        >
          {paginatedTickers.map((ticker, index) => (
            <button
              key={ticker}
              onClick={() => toggleTicker(ticker)}
              className="btn"
              style={{
                background: selectedTickers.includes(ticker)
                  ? "var(--primary)"
                  : "var(--card-bg)",
                border: `1px solid ${
                  selectedTickers.includes(ticker)
                    ? "var(--primary)"
                    : "var(--border-color)"
                }`,
                color: selectedTickers.includes(ticker)
                  ? "white"
                  : "var(--text-primary)",
                padding: "8px",
                fontSize: "12px",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "4px",
                  background: selectedTickers.includes(ticker)
                    ? "white"
                    : getLineColor(index, ticker),
                  opacity: selectedTickers.includes(ticker) ? 1 : 0.7,
                }}
              />
              {ticker}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats - Now shows visible data range */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: "8px",
        }}
      >
        <div className="stats-card radius-12 flexClm gap_4">
          <span className="card-label">Total Tickers</span>
          <span className="card-value">{tickerTimeData.tickers.length}</span>
        </div>
        <div className="stats-card radius-12 flexClm gap_4">
          <span className="card-label">Selected</span>
          <span className="card-value" style={{ color: "var(--primary)" }}>
            {selectedTickers.length}
          </span>
        </div>
        <div className="stats-card radius-12 flexClm gap_4">
          <span className="card-label">Showing</span>
          <span className="card-value font_12">
            {visibleChartData.length > 0 ? (
              <>
                {formatXAxisDate(visibleChartData[0]?.date)} -{" "}
                {formatXAxisDate(
                  visibleChartData[visibleChartData.length - 1]?.date,
                )}
              </>
            ) : (
              "No data"
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TickerAnalysis;
