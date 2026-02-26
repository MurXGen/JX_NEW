"use client";

import React, { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { formatCurrency } from "@/utils/formatNumbers";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";

const MIN_POINTS = 5;
const CHART_WINDOW = 10;

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

const PnLAreaChart = ({ data }) => {
  const [visibleData, setVisibleData] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [processedData, setProcessedData] = useState([]);
  const [overallTrend, setOverallTrend] = useState("neutral"); // positive, negative, neutral

  useEffect(() => {
    if (!data || data.length === 0) return;

    // Process data for area chart - cumulative PnL
    let cumulativePnL = 0;
    const processed = data.map((item, index) => {
      const netPnL = item.close - item.open;
      cumulativePnL += netPnL;

      return {
        ...item,
        cumulativePnL: cumulativePnL,
        netPnL: netPnL,
        isPositive: netPnL >= 0,
        isCumulativePositive: cumulativePnL >= 0,
      };
    });

    let finalProcessed = [...processed];

    // Add padding if needed
    if (finalProcessed.length < MIN_POINTS) {
      const padCount = Math.ceil((MIN_POINTS - finalProcessed.length) / 2);
      const firstDate = new Date(finalProcessed[0].date);
      const lastDate = new Date(finalProcessed[finalProcessed.length - 1].date);

      // Add padding before
      for (let i = padCount; i > 0; i--) {
        const d = new Date(firstDate);
        d.setDate(d.getDate() - i);
        finalProcessed.unshift({
          date: d.toISOString(),
          cumulativePnL: 0,
          netPnL: 0,
          isPositive: false,
          isCumulativePositive: false,
          isPadding: true,
        });
      }

      // Add padding after
      for (let i = 1; i <= padCount; i++) {
        const d = new Date(lastDate);
        d.setDate(d.getDate() + i);
        finalProcessed.push({
          date: d.toISOString(),
          cumulativePnL: cumulativePnL, // maintain final cumulative value
          netPnL: 0,
          isPositive: false,
          isCumulativePositive: cumulativePnL >= 0,
          isPadding: true,
        });
      }
    }

    // Determine overall trend
    const finalPnL = cumulativePnL;
    if (finalPnL > 0) {
      setOverallTrend("positive");
    } else if (finalPnL < 0) {
      setOverallTrend("negative");
    } else {
      setOverallTrend("neutral");
    }

    setProcessedData(finalProcessed);

    // Start from latest data
    const startIndex = Math.max(finalProcessed.length - CHART_WINDOW, 0);
    setCurrentIndex(startIndex);
    setVisibleData(finalProcessed.slice(startIndex, startIndex + CHART_WINDOW));
  }, [data]);

  const handlePrev = () => {
    const newIndex = Math.max(currentIndex - CHART_WINDOW, 0);
    setCurrentIndex(newIndex);
    setVisibleData(processedData.slice(newIndex, newIndex + CHART_WINDOW));
  };

  const handleNext = () => {
    const newIndex = Math.min(
      currentIndex + CHART_WINDOW,
      Math.max(processedData.length - CHART_WINDOW, 0),
    );
    setCurrentIndex(newIndex);
    setVisibleData(processedData.slice(newIndex, newIndex + CHART_WINDOW));
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      const data = payload[0].payload;

      return (
        <div className="boxBg tooltip font_12 flexClm gap_12">
          <div className="pnl-tooltip-header">
            {formatTooltipDate(data.date)}
          </div>
          <div className="flexClm">
            <span className="flexRow flexRow_stretch width100">
              <span>Total PnL:</span>
              <span className={data.cumulativePnL >= 0 ? "success" : "error"}>
                {formatCurrency(data.cumulativePnL)}
              </span>
            </span>
            {!data.isPadding && (
              <span className="flexRow flexRow_stretch width100">
                <span>Net pnl:</span>
                <span className={data.netPnL >= 0 ? "success" : "error"}>
                  {formatCurrency(data.netPnL)}
                </span>
              </span>
            )}
            {!data.isPadding && (
              <span className="flexRow flexRow_stretch width100">
                <span>Trades:</span>
                <span>{data.trades}</span>
              </span>
            )}
          </div>
          {data.isPadding && (
            <div className="font_10" style={{ color: "var(--white-50)" }}>
              Projected data
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Gradient IDs based on trend
  const gradientId = `area-gradient-${overallTrend}`;
  const strokeColor =
    overallTrend === "positive"
      ? "#22c55e"
      : overallTrend === "negative"
        ? "#ef4444"
        : "#6b7280";

  if (!visibleData.length) {
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
            Log trade to compute <br /> PNL growth analysis
          </span>
        </div>
      </div>
    );
  }
  return (
    <div className="chart_container radius-12 stats-card">
      <div className="flexRow flexRow_stretch">
        <span className="card-value">PNL Growth chart</span>
        <div className="flexRow gap_12">
          <button
            onClick={handlePrev}
            className="btn flexRow"
            disabled={currentIndex === 0}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={handleNext}
            className="btn flexRow"
            disabled={currentIndex + CHART_WINDOW >= processedData.length}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Pagination Buttons */}

      {/* Chart Container */}
      <div className="chart_container">
        <ResponsiveContainer width="100%" height="300">
          <AreaChart
            data={visibleData}
            margin={{ top: 20, right: 0, left: 0, bottom: 0 }}
          >
            <defs>
              {/* Green Gradient for Positive Trend */}
              <linearGradient
                id="area-gradient-positive"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.1} />
              </linearGradient>

              {/* Red Gradient for Negative Trend */}
              <linearGradient
                id="area-gradient-negative"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.1} />
              </linearGradient>

              {/* Gray Gradient for Neutral Trend */}
              <linearGradient
                id="area-gradient-neutral"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor="#6b7280" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#6b7280" stopOpacity={0.1} />
              </linearGradient>
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
              // axisLine={false}
              // tickLine={false}
            />

            <YAxis
              tick={{ fontSize: 12, fill: "var(--black)" }}
              tickFormatter={(value) => formatCurrency(value)}
              // axisLine={false}
              // tickLine={false}
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

            {/* Main Area */}
            <Area
              type="monotone"
              dataKey="cumulativePnL"
              stroke={strokeColor}
              strokeWidth={2}
              fill={`url(#area-gradient-${overallTrend})`}
              dot={(props) => {
                const { cx, cy, payload } = props;
                if (payload.isPadding) return null;

                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={3}
                    fill={payload.isCumulativePositive ? "#22c55e" : "#ef4444"}
                    stroke={props.stroke}
                    strokeWidth={1}
                  />
                );
              }}
              activeDot={(props) => {
                const { cx, cy, payload } = props;
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={5}
                    fill={payload.isCumulativePositive ? "#22c55e" : "#ef4444"}
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                );
              }}
              isAnimationActive={true}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PnLAreaChart;
