import { useMemo } from "react";
import React, { useEffect, useRef, useState } from "react";
import { Smile, AlertTriangle, Flame } from "lucide-react";
import AnimatedProgress from "../ui/AnimatedProgress";

const StatCard = ({ title, value }) => (
  <div className="stats-card radius-12">
    <span className="card-label">{title}</span>
    <span className="card-value">{value}</span>
  </div>
);

const TagPerformance = ({ tagAnalysis = [], currencySymbol = "$" }) => {
  const processedTags = useMemo(() => {
    if (!tagAnalysis.length) return [];

    return tagAnalysis.map((tag) => ({
      ...tag,
      winRateFormatted: `${tag.winRate.toFixed(1)}%`,
      avgPnLFormatted: `${currencySymbol}${tag.avgPnL.toFixed(2)}`,
      totalPnLFormatted: `${currencySymbol}${tag.totalPnL.toFixed(2)}`,
    }));
  }, [tagAnalysis, currencySymbol]);

  if (!processedTags.length) return null;

  const bestStrategy = processedTags[0]; // Already sorted by totalPnL
  const highestWinRate = [...processedTags].sort(
    (a, b) => b.winRate - a.winRate,
  )[0];

  return (
    <div className="tag-performance radius-12 flexClm gap_12">
      <span className="card-value">Tag Performance</span>

      {/* 🔥 Highlighted Insights */}
      <div className="tag-highlights flexRow gap_12">
        <StatCard
          title="Profitable Tag"
          value={bestStrategy.tag}
          subValue={`${bestStrategy.totalPnLFormatted}`}
          positive={bestStrategy.totalPnL > 0}
          highlight
        />

        <StatCard
          title="Highest Win Rate"
          value={highestWinRate.tag}
          subValue={highestWinRate.winRateFormatted}
          positive={highestWinRate.winRate > 50}
        />
      </div>

      {/* 📊 Tag List */}
      <div className="tag-grid flexClm gap_12">
        {processedTags.map((tag, index) => {
          const winRate =
            tag.avgPnL <= 0 || tag.totalPnL <= 0
              ? 0
              : Math.min(tag.winRate, 100);

          const getBarClass = () => {
            if (winRate < 25) return "bar-danger";
            if (winRate <= 50) return "bar-warning";
            return "bar-success";
          };

          return (
            <div key={tag.tag} className="stats-card radius-12 flexClm gap_12">
              <div className="flexRow flexRow_stretch">
                {/* Top Row */}
                <div className="card-value">
                  <span className="tag-name">{tag.tag}</span>
                </div>

                {/* PnL Info */}
                <div className="card-value flexRow gap_12">
                  {/* <span>Avg: {tag.avgPnLFormatted}</span>
                  {""} */}
                  <span className={tag.totalPnL > 0 ? "success" : "error"}>
                    Net PNL: {tag.totalPnLFormatted}
                  </span>
                </div>
              </div>

              <AnimatedProgress value={winRate} delay={index * 0.15} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TagPerformance;
