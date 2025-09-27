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
  const day = d.getDate(); // 1-31
  const month = d.toLocaleString("en-GB", { month: "short" }); // "Sep"
  return `${day}'${month}`; // 9'Sep
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

// Function to generate contextual timeline data
const generateContextualData = (originalData) => {
  if (!originalData || originalData.length === 0) return [];

  // If we have 5 or more days, use the data as-is
  if (originalData.length >= 5) {
    return originalData;
  }

  // Sort data by date to ensure chronological order
  const sortedData = [...originalData].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  // Get the date range of actual data
  const dates = sortedData.map((d) => new Date(d.date));
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));

  // Create contextual timeline: 2 days before and 2 days after the data range
  const contextualData = [];
  const daysToShow = 4; // Total days to show (2 before + actual days + 2 after)

  // Calculate start date (2 days before first trade)
  const startDate = new Date(minDate);
  startDate.setDate(startDate.getDate() - 1);

  // Generate 5 days of data points
  for (let i = 0; i < daysToShow; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);

    const dateString = currentDate.toISOString().split("T")[0];

    // Check if this date exists in original data
    const existingData = sortedData.find((d) => {
      const dDate = new Date(d.date).toISOString().split("T")[0];
      return dDate === dateString;
    });

    if (existingData) {
      // Use actual trade data
      contextualData.push({
        ...existingData,
        isActual: true,
        date: dateString,
      });
    } else {
      // Create empty/placeholder data for contextual days
      // Use the close price from the previous actual day, or 0 if no previous data
      const previousActualData = contextualData
        .filter((d) => d.isActual)
        .slice(-1)[0];
      const baseValue = previousActualData ? previousActualData.close : 0;

      contextualData.push({
        date: dateString,
        open: baseValue,
        high: baseValue,
        low: baseValue,
        close: baseValue,
        trades: 0,
        isActual: false,
        isPlaceholder: true,
      });
    }
  }

  return contextualData;
};

const DailyPnlChart = ({ data }) => {
  // Generate contextual data when we have limited days
  const chartData = generateContextualData(data);
  const hasPlaceholderData = chartData.some((d) => d.isPlaceholder);

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

      // Don't show tooltip for placeholder data
      if (data.isPlaceholder) {
        return (
          <div className="boxBg font_12 flexClm gap_12">
            <div className="pnl-tooltip-header">
              {formatTooltipDate(data.date)}
            </div>
            <div className="flexClm">
              <span className="font_12" style={{ color: "var(--white-50)" }}>
                No trades on this day
              </span>
            </div>
          </div>
        );
      }

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

  return (
    <div className="daily-pnl-chart-container">
      {hasPlaceholderData && (
        <div
          className="contextual-notice font_12"
          style={{
            textAlign: "center",
            color: "var(--white-50)",
            marginBottom: "var(--px-8)",
          }}
        >
          Showing contextual timeline around your trading days
        </div>
      )}

      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, bottom: 20 }}
          barSize={40} // Fixed bar size for consistency
          barCategoryGap="15%"
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

            {/* Placeholder (gray) */}
            <linearGradient id="candlePlaceholder" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6B7280" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#6B7280" stopOpacity={0.1} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />

          <XAxis
            dataKey="date"
            tickFormatter={formatXAxisDate}
            tick={{ fontSize: 12, fill: "#ccc" }}
            axisLine={false}
            tickLine={false}
            interval={0} // Show all ticks
          />

          <YAxis
            tick={{ fontSize: 12, fill: "#ccc" }}
            tickFormatter={(value) => formatCurrency(value)}
            width={60}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#ffffff05" }} />

          <Bar
            dataKey={(entry) => [entry.low, entry.high]}
            fill="#8884d8"
            shape={(props) => {
              const { open, close, high, low, isPlaceholder } = props.payload;

              if (isPlaceholder) {
                // Render placeholder as a simple line or dot
                return (
                  <g>
                    <circle
                      cx={props.x + props.width / 2}
                      cy={props.y + props.height / 2}
                      r={2}
                      fill="#6B7280"
                      opacity={0.5}
                    />
                    <line
                      x1={props.x + props.width / 2}
                      y1={props.y}
                      x2={props.x + props.width / 2}
                      y2={props.y + props.height}
                      stroke="#6B7280"
                      strokeWidth={1}
                      opacity={0.3}
                      strokeDasharray="2 2"
                    />
                  </g>
                );
              }

              const isPositive = close >= open;
              const fill = isPositive
                ? "url(#candlePositive)"
                : "url(#candleNegative)";
              const stroke = isPositive ? "#16A34A" : "#B91C1C";

              // Calculate body dimensions
              const yHigh = Math.min(high, Math.max(open, close));
              const yLow = Math.max(low, Math.min(open, close));
              const barHeight = Math.abs(close - open);

              // Fixed bar width for consistency
              const barWidth = 20;
              const barX = props.x + (props.width - barWidth) / 2;

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
                    x={barX}
                    y={
                      props.y +
                      ((high - Math.max(open, close)) / (high - low)) *
                        props.height
                    }
                    width={barWidth}
                    height={Math.max(
                      (barHeight / (high - low)) * props.height,
                      2
                    )}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={1}
                    rx={2}
                    ry={2}
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
