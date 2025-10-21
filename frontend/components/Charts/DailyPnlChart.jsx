"use client";

import React from "react";
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

const formatXAxisDate = (dateString) => {
  const d = new Date(dateString);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
  }); // e.g. "29/08"
};

const formatTooltipDate = (dateString) => {
  const d = new Date(dateString);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    weekday: "short",
  });
};

const DailyPnlChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="daily-pnl-chart-placeholder">
        <span className="font_12">No trades logged yet.</span>
      </div>
    );
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      const data = payload[0].payload;
      const netPnl = data.close - data.open;
      const isPositive = netPnl >= 0;

      return (
        <div className="boxBg font_12 flexClm gap_12">
          <div className="pnl-tooltip-header">
            {formatTooltipDate(data.date)}
          </div>
          <div className="flexClm ">
            <span className="flexRow flexRow_stretch width100">
              <span>Open:</span>
              <span>{formatCurrency(data.open)}</span>
            </span>
            <span className="flexRow flexRow_stretch width100">
              <span>High:</span>
              <span>{formatCurrency(data.high)}</span>
            </span>
            <span className="flexRow flexRow_stretch width100">
              <span>Low:</span>
              <span>{formatCurrency(data.low)}</span>
            </span>
            <span className="flexRow flexRow_stretch width100">
              <span>Close:</span>
              <span>{formatCurrency(data.close)}</span>
            </span>
            <span className="flexRow flexRow_stretch width100">
              <span>Trades:</span>
              <span>{data.trades}</span>
            </span>
          </div>

          <div
            className={`pnl-tooltip-value ${
              isPositive ? "positive" : "negative"
            }`}
          >
            {formatCurrency(netPnl)} Net PnL
          </div>
        </div>
      );
    }
    return null;
  };

  // Helper to add empty candle days
  const addPaddingDays = (data, before = 3, after = 3) => {
    if (data.length > 8) return [...data]; // 👈 skip padding for >8 days

    const padded = [...data];
    const firstDate = new Date(data[0].date);
    const lastDate = new Date(data[data.length - 1].date);

    // Add days before
    for (let i = before; i > 0; i--) {
      const d = new Date(firstDate);
      d.setDate(d.getDate() - i);
      padded.unshift({
        date: d.toISOString(),
        open: null,
        high: null,
        low: null,
        close: null,
        trades: null,
        isPadding: true,
      });
    }

    // Add days after
    for (let i = 1; i <= after; i++) {
      const d = new Date(lastDate);
      d.setDate(d.getDate() + i);
      padded.push({
        date: d.toISOString(),
        open: null,
        high: null,
        low: null,
        close: null,
        trades: null,
        isPadding: true,
      });
    }

    return padded;
  };

  const chartData = addPaddingDays(data);

  return (
    <div className="chart_container">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 0, left: 0, bottom: 0 }}
        >
          <defs>
            {/* Positive (green) */}
            <linearGradient id="candlePositive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22C55E" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#22C55E80" stopOpacity={0.5} />
            </linearGradient>

            {/* Negative (red) */}
            <linearGradient id="candleNegative" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#EF444480" stopOpacity={0.5} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />

          <XAxis
            dataKey="date"
            tickFormatter={formatXAxisDate}
            tick={{ fontSize: 12, fill: "#ccc" }}
            axisLine={false}
            tickLine={false}
            textAnchor="middle"
            interval="preserveStartEnd" // 👈 keeps start, thins out the rest dynamically
            height={30}
          />

          <YAxis
            tick={{ fontSize: 12, fill: "#ccc" }}
            tickFormatter={(value) => formatCurrency(value)}
          />

          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "#ffffff10" }} // 👈 removes grey box
          />

          <Bar
            dataKey={(entry) => [entry.low, entry.high]}
            fill="#8884d8"
            shape={(props) => {
              const { x, y, width, height, payload } = props;
              const { open, close, high, low, isPadding } = payload;

              if (isPadding) return null; // skip padding

              const isPositive = close >= open;
              const fillColor = isPositive
                ? "url(#candlePositive)"
                : "url(#candleNegative)";
              const strokeColor = isPositive ? "#16A34A" : "#B91C1C";

              const bodyHeight = Math.max(Math.abs(close - open), 2); // ensure min height
              const yPos = isPositive
                ? y + ((high - close) / (high - low)) * height
                : y + ((high - open) / (high - low)) * height;

              return (
                <g>
                  {/* Wick */}
                  <line
                    x1={x + width / 2}
                    y1={y}
                    x2={x + width / 2}
                    y2={y + height}
                    stroke={strokeColor}
                    strokeWidth={1}
                  />

                  {/* Candle body with rounded corners */}
                  <rect
                    x={x + width * 0.15}
                    y={yPos}
                    width={width * 0.7}
                    height={(bodyHeight / (high - low)) * height || 2}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={1}
                    rx={4} // horizontal corner radius
                    ry={4} // vertical corner radius
                  />
                </g>
              );
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DailyPnlChart;
