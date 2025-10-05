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
        <p>No trade data available</p>
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

  if (!data || data.length === 0) {
    return (
      <div className="daily-pnl-chart-placeholder">
        <p>No trade data available</p>
      </div>
    );
  }

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
    <div className="daily-pnl-chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
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
              const { open, close, high, low, isPadding } = props.payload;

              if (isPadding) {
                // 👇 Don't render anything for padding dates
                return null;
              }

              const isPositive = close >= open;
              const fill = isPositive
                ? "url(#candlePositive)"
                : "url(#candleNegative)";
              const stroke = isPositive ? "#16A34A" : "#B91C1C";

              // Calculate candle body
              const yHigh = Math.min(high, Math.max(open, close));
              const yLow = Math.max(low, Math.min(open, close));
              const barHeight = Math.abs(close - open);

              return (
                <g>
                  {/* Wick */}
                  <line
                    x1={props.x + props.width / 2}
                    y1={props.y}
                    x2={props.x + props.width / 2}
                    y2={props.y + props.height}
                    stroke={stroke}
                    strokeWidth={1}
                  />

                  {/* Candle body */}
                  <rect
                    x={props.x + props.width * 0.15}
                    y={
                      props.y +
                      ((high - Math.max(open, close)) / (high - low)) *
                        props.height
                    }
                    width={props.width * 0.7}
                    height={(barHeight / (high - low)) * props.height || 2}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={1}
                    rx={3}
                    ry={3}
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
