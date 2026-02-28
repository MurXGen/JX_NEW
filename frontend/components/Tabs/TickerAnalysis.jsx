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
  Legend,
} from "recharts";
import { formatCurrency } from "@/utils/formatNumbers";
import { ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";

const TickerAnalysis = ({ trades }) => {
  const [selectedTickers, setSelectedTickers] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const TICKERS_PER_PAGE = 5;

  // Get unique tickers and prepare time-based data
  const tickerTimeData = useMemo(() => {
    if (!trades || trades.length === 0) return { tickers: [], timeData: [] };

    // Sort trades by date
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

      const date = new Date(trade.openTime).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

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

  // Initialize selected tickers
  useEffect(() => {
    if (tickerTimeData.tickers.length > 0) {
      setSelectedTickers(tickerTimeData.tickers.slice(0, 5));
    }
    setChartData(tickerTimeData.timeData);
  }, [tickerTimeData]);

  // Pagination
  const totalPages = Math.ceil(
    tickerTimeData.tickers.length / TICKERS_PER_PAGE,
  );
  const paginatedTickers = tickerTimeData.tickers.slice(
    currentPage * TICKERS_PER_PAGE,
    (currentPage + 1) * TICKERS_PER_PAGE,
  );

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

  const deselectAll = () => {
    setSelectedTickers((prev) =>
      prev.filter((t) => !paginatedTickers.includes(t)),
    );
  };

  // Generate colors for lines
  const getLineColor = (index) => {
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
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--border-color)",
            borderRadius: "12px",
            padding: "12px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "var(--text-secondary)",
              marginBottom: "8px",
            }}
          >
            {label}
          </div>
          {payload.map((entry, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "4px",
                fontSize: "12px",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "4px",
                  background: entry.color,
                }}
              />
              <span style={{ color: "var(--text-secondary)" }}>
                {entry.name}:
              </span>
              <span
                style={{
                  color: entry.value >= 0 ? "var(--success)" : "var(--error)",
                  fontWeight: "600",
                }}
              >
                {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
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
    <div className="stats-card radius-12">
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <TrendingUp size={20} color="var(--primary)" />
        <span
          style={{
            fontSize: "16px",
            fontWeight: "600",
            color: "var(--text-primary)",
          }}
        >
          Ticker Performance Over Time
        </span>
      </div>

      {/* Ticker Selection */}
      <div
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border-color)",
          borderRadius: "12px",
        }}
      >
        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "12px",
            }}
          >
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 0}
              style={{
                padding: "6px 12px",
                background: "var(--card-bg)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                cursor: currentPage === 0 ? "not-allowed" : "pointer",
                opacity: currentPage === 0 ? 0.5 : 1,
                color: "var(--text-primary)",
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages - 1}
              style={{
                padding: "6px 12px",
                background: "var(--card-bg)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                cursor:
                  currentPage === totalPages - 1 ? "not-allowed" : "pointer",
                opacity: currentPage === totalPages - 1 ? 0.5 : 1,
                color: "var(--text-primary)",
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Quick Actions */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "12px",
          }}
        >
          <button
            onClick={selectAll}
            style={{
              padding: "4px 12px",
              background: "var(--primary-10)",
              border: "1px solid var(--primary-20)",
              borderRadius: "16px",
              fontSize: "11px",
              color: "var(--primary)",
              cursor: "pointer",
            }}
          >
            Select All
          </button>
          <button
            onClick={deselectAll}
            style={{
              padding: "4px 12px",
              background: "var(--card-bg)",
              border: "1px solid var(--border-color)",
              borderRadius: "16px",
              fontSize: "11px",
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            Deselect All
          </button>
        </div>

        {/* Ticker Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
            gap: "8px",
          }}
        >
          {paginatedTickers.map((ticker, index) => (
            <button
              key={ticker}
              onClick={() => toggleTicker(ticker)}
              style={{
                padding: "8px",
                background: selectedTickers.includes(ticker)
                  ? "var(--primary)"
                  : "var(--card-bg)",
                border: `1px solid ${
                  selectedTickers.includes(ticker)
                    ? "var(--primary)"
                    : "var(--border-color)"
                }`,
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "500",
                color: selectedTickers.includes(ticker)
                  ? "white"
                  : "var(--text-primary)",
                cursor: "pointer",
                transition: "all 0.2s",
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
                    : getLineColor(index),
                  opacity: selectedTickers.includes(ticker) ? 1 : 0.5,
                }}
              />
              {ticker}
            </button>
          ))}
        </div>
      </div>

      {/* Line Chart */}
      <div style={{ height: "300px", width: "" }}>
        <ResponsiveContainer>
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border-color)"
              opacity={0.3}
            />

            <XAxis
              dataKey="date"
              stroke="var(--text-secondary)"
              tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
              tickLine={{ stroke: "var(--border-color)" }}
            />

            <YAxis
              stroke="var(--text-secondary)"
              tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
              tickLine={{ stroke: "var(--border-color)" }}
              tickFormatter={(value) => formatCurrency(value)}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              wrapperStyle={{
                fontSize: "11px",
                color: "var(--text-secondary)",
                paddingTop: "10px",
              }}
            />

            {selectedTickers.map((ticker, index) => (
              <Line
                key={ticker}
                type="monotone"
                dataKey={ticker}
                stroke={getLineColor(index)}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, fill: getLineColor(index) }}
                name={ticker}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "12px",
          marginTop: "20px",
          padding: "16px",
          background: "var(--card-bg)",
          border: "1px solid var(--border-color)",
          borderRadius: "12px",
        }}
      >
        <div>
          <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
            Total Tickers
          </div>
          <div
            style={{
              fontSize: "18px",
              fontWeight: "600",
              color: "var(--text-primary)",
            }}
          >
            {tickerTimeData.tickers.length}
          </div>
        </div>
        <div>
          <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
            Selected Tickers
          </div>
          <div
            style={{
              fontSize: "18px",
              fontWeight: "600",
              color: "var(--primary)",
            }}
          >
            {selectedTickers.length}
          </div>
        </div>
        <div>
          <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
            Time Range
          </div>
          <div
            style={{
              fontSize: "14px",
              fontWeight: "500",
              color: "var(--text-primary)",
            }}
          >
            {chartData.length > 0 &&
              `${chartData[0]?.date} - ${chartData[chartData.length - 1]?.date}`}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TickerAnalysis;
