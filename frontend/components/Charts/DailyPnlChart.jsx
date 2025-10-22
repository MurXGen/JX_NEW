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
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";

const MIN_CANDLES = 5;
const CANDLE_WINDOW = 10; // number of candles to show per page

const formatXAxisDate = (dateString) => {
  const d = new Date(dateString);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" });
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
  const [visibleData, setVisibleData] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0); // start index for window
  const [processedData, setProcessedData] = useState([]);

  useEffect(() => {
    if (!data || data.length === 0) return;

    let processed = [...data];

    // ---- Padding if less than MIN_CANDLES ----
    if (processed.length < MIN_CANDLES) {
      const padCount = Math.ceil((MIN_CANDLES - processed.length) / 2);
      const firstDate = new Date(processed[0].date);
      const lastDate = new Date(processed[processed.length - 1].date);

      for (let i = padCount; i > 0; i--) {
        const d = new Date(firstDate);
        d.setDate(d.getDate() - i);
        processed.unshift({
          date: d.toISOString(),
          open: null,
          high: null,
          low: null,
          close: null,
          trades: null,
          isPadding: true,
        });
      }

      for (let i = 1; i <= padCount; i++) {
        const d = new Date(lastDate);
        d.setDate(d.getDate() + i);
        processed.push({
          date: d.toISOString(),
          open: null,
          high: null,
          low: null,
          close: null,
          trades: null,
          isPadding: true,
        });
      }
    }

    setProcessedData(processed);

    // Start viewport from latest candles
    const startIndex = Math.max(processed.length - CANDLE_WINDOW, 0);
    setCurrentIndex(startIndex);
    setVisibleData(processed.slice(startIndex, startIndex + CANDLE_WINDOW));
  }, [data]);

  // ---- Handle pagination ----
  const handlePrev = () => {
    const newIndex = Math.max(currentIndex - CANDLE_WINDOW, 0);
    setCurrentIndex(newIndex);
    setVisibleData(processedData.slice(newIndex, newIndex + CANDLE_WINDOW));
  };

  const handleNext = () => {
    const newIndex = Math.min(
      currentIndex + CANDLE_WINDOW,
      Math.max(processedData.length - CANDLE_WINDOW, 0)
    );
    setCurrentIndex(newIndex);
    setVisibleData(processedData.slice(newIndex, newIndex + CANDLE_WINDOW));
  };

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
          <div className="flexClm">
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

  if (!visibleData.length) {
    return <div>No trades logged yet.</div>;
  }

  return (
    <div>
      {/* Pagination Buttons */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "8px",
        }}
      >
        <button
          onClick={handlePrev}
          className="button_ter flexRow"
          disabled={currentIndex === 0}
        >
          <ChevronLeft size={20} />
        </button>

        <button
          onClick={handleNext}
          className="button_ter flexRow"
          disabled={currentIndex + CANDLE_WINDOW >= processedData.length}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Chart */}
      <div
        className="chart_container"
        style={{ overflowX: "auto", width: "100%", height: "300px" }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={visibleData}
            margin={{ top: 20, right: 0, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#374151"
              opacity={0.3}
            />
            <XAxis
              dataKey="date"
              tick={({ x, y, payload }) => {
                const d = new Date(payload.value);
                const today = new Date();
                const isToday =
                  d.getDate() === today.getDate() &&
                  d.getMonth() === today.getMonth() &&
                  d.getFullYear() === today.getFullYear();

                return (
                  <text
                    x={x}
                    y={y + 15} // adjust vertical position
                    textAnchor="middle"
                    className={isToday ? "" : "shade_50"}
                    fontSize={12}
                    fill={isToday ? "#fff" : "#999"} // fallback if shade_50 is not applied
                  >
                    {d.toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </text>
                );
              }}
            />

            <YAxis
              tick={{ fontSize: 12, fill: "#ccc" }}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "#ffffff10" }}
            />
            <Bar
              dataKey={(entry) => [entry.low, entry.high]}
              shape={(props) => {
                const { x, y, width, height, payload } = props;
                const { open, close, high, low, isPadding } = payload;
                if (isPadding) return null;

                const isPositive = close >= open;
                const fillColor = isPositive ? "#22C55E" : "#EF4444";
                const strokeColor = isPositive ? "#16A34A" : "#B91C1C";
                const bodyHeight = Math.max(Math.abs(close - open), 2);
                const yPos = isPositive
                  ? y + ((high - close) / (high - low)) * height
                  : y + ((high - open) / (high - low)) * height;

                return (
                  <g>
                    <line
                      x1={x + width / 2}
                      y1={y}
                      x2={x + width / 2}
                      y2={y + height}
                      stroke={strokeColor}
                      strokeWidth={1}
                    />
                    <rect
                      x={x + width * 0.15}
                      y={yPos}
                      width={width * 0.7}
                      height={(bodyHeight / (high - low)) * height || 2}
                      fill={fillColor}
                      stroke={strokeColor}
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
    </div>
  );
};

export default DailyPnlChart;
