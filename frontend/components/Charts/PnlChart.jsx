"use client";

import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  YAxis,
  Cell,
  LabelList,
} from "recharts";
import { useMemo, useState } from "react";
import { formatNumber } from "@/utils/formatNumbers";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function PNLChart({ dailyData }) {
  const [weekOffset, setWeekOffset] = useState(0);

  const startOfWeek = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(now.setDate(diff));
    // Adjust based on week offset
    start.setDate(start.getDate() + weekOffset * 7);
    // Set to beginning of Monday in local timezone
    start.setHours(0, 0, 0, 0);
    return start;
  }, [weekOffset]);

  const weekData = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    // Create a map for the week with UTC date boundaries
    const map = Object.fromEntries(
      days.map((d, i) => {
        const dayDate = new Date(startOfWeek);
        dayDate.setDate(startOfWeek.getDate() + i);

        // Create UTC boundaries for this day
        const utcStart = new Date(dayDate);
        utcStart.setHours(0, 0, 0, 0);
        const utcEnd = new Date(dayDate);
        utcEnd.setHours(23, 59, 59, 999);

        return [
          d,
          {
            pnl: 0,
            date: dayDate.toLocaleDateString("en-US", {
              day: "numeric",
              month: "short",
            }),
            utcStart: utcStart.getTime(),
            utcEnd: utcEnd.getTime(),
          },
        ];
      })
    );

    // Process each trade
    dailyData.forEach(({ date, pnl }) => {
      const tradeDate = new Date(date);
      const tradeTime = tradeDate.getTime();

      // Find which day this trade belongs to
      for (const day in map) {
        if (tradeTime >= map[day].utcStart && tradeTime <= map[day].utcEnd) {
          map[day].pnl += pnl;
          break;
        }
      }
    });

    return days.map((d) => ({
      day: d,
      pnl: map[d].pnl,
      date: map[d].date,
    }));
  }, [dailyData, startOfWeek]);

  const maxPnl = Math.max(...weekData.map((d) => d.pnl));
  const minPnl = Math.min(...weekData.map((d) => d.pnl));

  // Format week range for display
  const weekRange = useMemo(() => {
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const formatOptions = { day: "numeric", month: "short" };
    const startFormatted = startOfWeek.toLocaleDateString(
      "en-US",
      formatOptions
    );
    const endFormatted = endOfWeek.toLocaleDateString("en-US", formatOptions);

    return `${startFormatted} - ${endFormatted}`;
  }, [startOfWeek]);

  // Navigation handlers
  const handlePreviousWeek = () => {
    setWeekOffset((prev) => prev - 1);
  };

  const handleNextWeek = () => {
    setWeekOffset((prev) => prev + 1);
  };

  const handleCurrentWeek = () => {
    setWeekOffset(0);
  };

  // 🎨 Custom Tooltip (styled like your OHLC tooltip)
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      const { pnl, day, date } = payload[0].payload;

      let pnlClass = "neutral";
      if (pnl > 0) pnlClass = "positive";
      else if (pnl < 0) pnlClass = "negative";

      return (
        <div className="boxBg font_12 flexClm gap_12">
          <div className="pnl-tooltip-header">
            {day} {date && `(${date})`}
          </div>

          <div className={`pnl-tooltip-value ${pnlClass}`}>
            {formatNumber(pnl)} Net PnL
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-container daily-pnl-chart-container">
      {/* Navigation Header */}
      <div className="flexRow flexRow_stretch font_12">
        <button
          onClick={handlePreviousWeek}
          className="button_ter flexRow"
          aria-label="Previous week"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flexRow gap_12">
          <span>{weekRange}</span>
          {weekOffset !== 0 && (
            <button onClick={handleCurrentWeek} className="button_ter">
              Current Week
            </button>
          )}
        </div>

        <button
          onClick={handleNextWeek}
          className="button_ter flexRow"
          aria-label="Next week"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <BarChart
          data={weekData}
          barCategoryGap="30%"
          margin={{ top: 40, bottom: 20 }}
        >
          <defs>
            <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22C55E" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#22C55E80" stopOpacity={0.5} />
            </linearGradient>
            <linearGradient id="pnlNegative" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#EF444480" stopOpacity={0.5} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, dy: 16, fill: "#888" }}
          />

          <YAxis
            hide
            domain={[
              (dataMin) => Math.min(0, dataMin * 1.2),
              (dataMax) => dataMax * 1.2,
            ]}
          />

          <ReferenceLine y={0} stroke="#aaa" strokeDasharray="3 3" />

          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#ffffff10" }} />

          <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
            {weekData.map((entry, i) => (
              <Cell
                key={`cell-${i}`}
                fill={
                  entry.pnl >= 0 ? "url(#pnlGradient)" : "url(#pnlNegative)"
                }
              />
            ))}

            <LabelList
              dataKey="pnl"
              position="top"
              className="bar-label"
              formatter={(val) => {
                if (val === maxPnl || val === minPnl) {
                  return formatNumber(val);
                }
                return "";
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
