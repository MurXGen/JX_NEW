// components/Analysis/TagAnalysis.js
"use client";

import React, { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { formatCurrency, formatNumber } from "@/utils/formatNumbers";
import {
  BarChart3,
  ListIcon,
  PieChartIcon,
  Tag,
  TrendingUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const TagAnalysis = ({ tagAnalysis }) => {
  const [viewMode, setViewMode] = useState("chart"); // "chart" or "list"
  const [sortBy, setSortBy] = useState("pnl"); // "pnl", "trades", "winRate"

  if (!tagAnalysis || tagAnalysis.length === 0) {
    return (
      <div
        className="flexRow flexRow_stretch chart_boxBg gap_12"
        style={{ padding: "16px" }}
      >
        <div className=" flexClm gap_8">
          <span className="font_16">No Tag Analysis Available</span>
          <span className="font_12">Add reasons/tags while logging trades</span>
        </div>
        <span className="">
          <Tag className="vector" />
        </span>
      </div>
    );
  }

  // Format tag names - remove brackets, capitalize first letter, and filter blank strings
  const formatTagName = (tagName) => {
    const capitalize = (str) =>
      str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

    if (Array.isArray(tagName)) {
      return tagName
        .map((name) => {
          const cleanedName = name.replace(/[\[\]"]/g, "").trim();
          return cleanedName ? capitalize(cleanedName) : null;
        })
        .filter(Boolean) // Remove null/empty values
        .join(", ");
    }

    const cleanedName = String(tagName)
      .replace(/[\[\]"]/g, "")
      .trim();
    return cleanedName ? capitalize(cleanedName) : "Untagged";
  };

  // Prepare data for charts with formatted names and filter out blank tags
  const chartData = tagAnalysis
    .map((tag, index) => {
      const formattedName = formatTagName(tag.tag);
      // Skip tags that result in empty names after cleaning
      if (!formattedName || formattedName === "Untagged") return null;

      return {
        name: formattedName,
        originalName: tag.tag,
        value: Math.abs(tag.totalPnL),
        trades: tag.totalTrades,
        winRate: tag.winRate,
        pnl: tag.totalPnL,
        colorIndex: index,
      };
    })
    .filter(Boolean); // Remove null entries

  // For Bar chart (signed values so negatives render below axis)
  const barChartData = tagAnalysis
    .map((tag, index) => {
      const formattedName = formatTagName(tag.tag);
      // Skip tags that result in empty names after cleaning
      if (!formattedName || formattedName === "Untagged") return null;

      return {
        name: formattedName,
        value: tag.totalPnL,
        trades: tag.totalTrades,
        winRate: tag.winRate,
        pnl: tag.totalPnL,
        colorIndex: index,
      };
    })
    .filter(Boolean); // Remove null entries

  // Sort data based on current sort option and filter out blank tags
  const sortedData = [...tagAnalysis]
    .map((tag) => ({
      ...tag,
      formattedTag: formatTagName(tag.tag),
    }))
    .filter((tag) => tag.formattedTag && tag.formattedTag !== "Untagged") // Filter out blank tags
    .sort((a, b) => {
      switch (sortBy) {
        case "trades":
          return b.totalTrades - a.totalTrades;
        case "winRate":
          return b.winRate - a.winRate;
        case "pnl":
        default:
          return b.totalPnL - a.totalPnL;
      }
    });

  // Colors for charts - same as pie chart
  const COLORS = [
    "#f59e0b",
    "#8b5cf6",
    "#06b6d4",
    "#f97316",
    "#84cc16",
    "#ec4899",
    "#14b8a6",
    "#f43f5e",
    "#a855f7",
    "#3b82f6",
  ];

  const BarTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const color = COLORS[data.colorIndex % COLORS.length];

      return (
        <div className="tooltip-container boxBg font_12 flexClm gap_8">
          <div className="tooltip-header flexRow gap_8">
            <div className="color-badge" style={{ backgroundColor: color }} />
            <strong>{data.name}</strong>
          </div>
          <div className="tooltip-stats flexClm gap_4">
            <span className="flexRow flexRow_stretch">
              <span>Total PnL:</span>
              <span className={data.pnl >= 0 ? "success" : "error"}>
                {formatCurrency(data.pnl)}
              </span>
            </span>
            <span className="flexRow flexRow_stretch">
              <span>Avg PnL:</span>
              <span>{formatCurrency(data.pnl / data.trades)}</span>
            </span>
            <span className="flexRow flexRow_stretch">
              <span>Trades:</span>
              <span>{data.trades}</span>
            </span>
            <span className="flexRow flexRow_stretch">
              <span>Win Rate:</span>
              <span>{data.winRate.toFixed(1)}%</span>
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom XAxis with properly aligned dots

  //   const CustomXAxis = ({ x, y, payload, index }) => {
  //     const color = COLORS[index % COLORS.length];
  //     const barWidth = 30; // Match barSize
  //     const dotOffset = barWidth / 2; // Center dot under bar

  //     return (
  //       <g transform={`translate(${x + dotOffset},${y})`}>
  //         <circle
  //           cx={0}
  //           cy={20}
  //           r={4}
  //           fill={color}
  //           stroke="#374151"
  //           strokeWidth={1}
  //         />
  //         <text
  //           x={0}
  //           y={40}
  //           textAnchor="middle"
  //           fill="#ccc"
  //           fontSize={10}
  //           className="font_10"
  //         >
  //           {payload.value.length > 8
  //             ? payload.value.substring(0, 8) + "..."
  //             : payload.value}
  //         </text>
  //       </g>
  //     );
  //   };

  // Color legend component with badge design

  // Color legend component with badge design - use chartData instead of tagAnalysis
  const ColorLegend = () => (
    <div style={{ marginTop: "12px" }}>
      <div className=" flexRow flex_center gap_8">
        {chartData.map((tag, index) => {
          const color = COLORS[index % COLORS.length];
          return (
            <div key={index} className="flexRow flex_center gap_4">
              <div
                className="legend-badge font_12 flexRow flex_center gap_4"
                style={{
                  backgroundColor: color + "20",
                  borderRadius: "12px",
                  padding: "8px 8px",
                }}
              >
                <div className="flexRow flexRow_scroll flex_center" />
                <span className="font_12" style={{ color: color }}>
                  {tag.name}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Instead of using tagAnalysis directly in summary,
  // use chartData (already filtered + formatted).
  const validTags = chartData;

  return (
    <div className="boxBg flexClm gap_12" style={{ padding: "var(--px-16)" }}>
      <div className="tag-analysis-controls flexRow gap_12 width100">
        <div className="view-toggle flexRow width100">
          <button
            className={`toggle-btn flexRow gap_4 flex_center width100 ${viewMode === "chart" ? "active" : ""}`}
            onClick={() => setViewMode("chart")}
          >
            <BarChart3 size={16} />
            Charts
          </button>
          <button
            className={`toggle-btn flexRow gap_4 flex_center width100 ${viewMode === "list" ? "active" : ""}`}
            onClick={() => setViewMode("list")}
          >
            <ListIcon size={16} />
            Analytics
          </button>
        </div>
      </div>
      {/* Content */}
      <AnimatePresence mode="wait">
        <div className="tag-analysis-content">
          {viewMode === "chart" ? (
            <motion.div
              key="chart"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="tag-charts-container"
            >
              {/* PnL Distribution Pie Chart with Legend below */}
              <div className="chart-section">
                <div className="boxBg flex_center font_12 flexRow gap_8">
                  <PieChartIcon size={16} className="vector" />
                  PnL Distribution by Tag
                </div>
                <ResponsiveContainer
                  width="100%"
                  height={200}
                  className="chart_container"
                >
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                          stroke={entry.pnl < 0 ? "#EF4444" : "#22C55E"} // ✅ red/green border
                          strokeWidth={entry.pnl < 0 ? 2 : 1}
                        />
                      ))}
                    </Pie>

                    <Tooltip content={<BarTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Color Legend below Pie Chart */}
                <ColorLegend />
              </div>

              {/* Performance Bar Chart with PNL-style design */}
              <div className="chart-section">
                <div className="boxBg flex_center flexRow gap_8 font_12">
                  <TrendingUp size={16} className="vector" />
                  Performance by Tag
                </div>
                <ResponsiveContainer
                  width="100%"
                  height={330}
                  className="chart_container"
                >
                  <BarChart
                    data={barChartData} // ✅ signed data
                    margin={{ top: 20, right: 10, left: 10, bottom: 40 }}
                    barCategoryGap="30%"
                  >
                    <defs>
                      {/* ✅ Same gradients as PNLChart */}
                      <linearGradient
                        id="tagPositive"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#22C55E"
                          stopOpacity={0.9}
                        />
                        <stop
                          offset="100%"
                          stopColor="#22C55E80"
                          stopOpacity={0.5}
                        />
                      </linearGradient>
                      <linearGradient
                        id="tagNegative"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#EF4444"
                          stopOpacity={0.9}
                        />
                        <stop
                          offset="100%"
                          stopColor="#EF444480"
                          stopOpacity={0.5}
                        />
                      </linearGradient>
                    </defs>

                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      height={10}
                      tick={({ x, y, payload, index }) => {
                        const color = COLORS[index % COLORS.length];

                        return (
                          <g transform={`translate(${x},${y})`}>
                            {/* Dot exactly centered under bar */}
                            <circle
                              cx={0}
                              cy={10}
                              r={6}
                              fill={color}
                              stroke="#374151"
                              strokeWidth={1}
                            />
                            {/* Tag label below the dot */}
                            {/* <text
                            x={0}
                            y={28}
                            textAnchor="middle"
                            fill="#ccc"
                            fontSize={10}
                          >
                            {payload.value.length > 8
                              ? payload.value.substring(0, 8) + "..."
                              : payload.value}
                          </text> */}
                          </g>
                        );
                      }}
                    />

                    <YAxis
                      dataKey="value"
                      tickFormatter={(val) => formatCurrency(val)}
                      tick={{ fontSize: 12, fill: "#ccc" }}
                      width={60}
                    />

                    <Tooltip
                      content={<BarTooltip />}
                      cursor={{ fill: "#ffffff10" }}
                    />

                    <ReferenceLine y={0} stroke="#aaa" strokeDasharray="3 3" />

                    {/* Bars with green/red gradient fill */}
                    <Bar dataKey="value" radius={[12, 12, 0, 0]} barSize={30}>
                      {barChartData.map((entry, i) => (
                        <Cell
                          key={`bar-cell-${i}`}
                          fill={
                            entry.value >= 0
                              ? "url(#tagPositive)"
                              : "url(#tagNegative)"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="tag-list-container"
            >
              <div className="tag-list-header flexRow font_12">
                <span style={{ flex: 2 }}>Tag</span>
                <span style={{ flex: 1, textAlign: "center" }}>Trades</span>
                <span style={{ flex: 1, textAlign: "center" }}>Win Rate</span>
                <span style={{ flex: 1, textAlign: "right" }}>Total PnL</span>
              </div>

              <div className="tag-list">
                {sortedData.map((tag, index) => {
                  const color = COLORS[index % COLORS.length];
                  return (
                    <div key={tag.tag} className="tag-item flexRow">
                      <div className="tag-info" style={{ flex: 2 }}>
                        <div className="tag-name-container flexRow gap_8">
                          <div
                            className="tag-color-indicator"
                            style={{ backgroundColor: color }}
                          />
                          <div className="tag-name font_14">
                            {tag.formattedTag}
                          </div>
                        </div>
                        <div
                          className="tag-stats font_12"
                          style={{ color: "var(--white-50)" }}
                        >
                          {tag.winTrades}W / {tag.loseTrades}L
                        </div>
                      </div>

                      <div
                        className="tag-trades font_14"
                        style={{ flex: 1, textAlign: "center" }}
                      >
                        {tag.totalTrades}
                      </div>

                      <div
                        className="tag-winrate"
                        style={{ flex: 1, textAlign: "center" }}
                      >
                        <div className="winrate-value font_14">
                          {tag.winRate.toFixed(1)}%
                        </div>
                        <div className="winrate-bar">
                          <div
                            className="winrate-fill"
                            style={{
                              width: `${tag.winRate}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>
                      </div>

                      <div
                        className={`tag-pnl font_14 ${
                          tag.totalPnL >= 0 ? "success" : "error"
                        }`}
                        style={{ flex: 1, textAlign: "right" }}
                      >
                        {formatCurrency(tag.totalPnL)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>
      </AnimatePresence>

      {/* Summary Stats */}
      <div className="tag-summary flexRow flexRow_stretch">
        <div className="summary-item">
          <div className="summary-value font_16">{validTags.length}</div>
          <div className="summary-label font_12">Total Tags</div>
        </div>

        <div className="summary-item">
          <div className="summary-value font_16 success">
            {validTags.filter((tag) => tag.pnl > 0).length}
          </div>
          <div className="summary-label font_12">Profitable Tags</div>
        </div>

        <div className="summary-item">
          <div className="summary-value font_16">
            {formatCurrency(validTags.reduce((sum, tag) => sum + tag.pnl, 0))}
          </div>
          <div className="summary-label font_12">Total PnL</div>
        </div>
      </div>
    </div>
  );
};

export default TagAnalysis;
