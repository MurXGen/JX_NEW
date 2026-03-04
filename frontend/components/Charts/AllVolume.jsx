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

export default function VolumeChart({ dailyData }) {
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
            totalVolume: 0,
            longVolume: 0,
            shortVolume: 0,
            date: dayDate.toLocaleDateString("en-US", {
              day: "numeric",
              month: "short",
            }),
            utcStart: utcStart.getTime(),
            utcEnd: utcEnd.getTime(),
          },
        ];
      }),
    );

    // Process each trade
    dailyData.forEach(({ date, longVolume = 0, shortVolume = 0 }) => {
      const tradeDate = new Date(date);
      const tradeTime = tradeDate.getTime();

      // Find which day this trade belongs to
      for (const day in map) {
        if (tradeTime >= map[day].utcStart && tradeTime <= map[day].utcEnd) {
          map[day].longVolume += longVolume;
          map[day].shortVolume += shortVolume;
          map[day].totalVolume += longVolume + shortVolume;
          break;
        }
      }
    });

    return days.map((d) => ({
      day: d,
      totalVolume: map[d].totalVolume,
      longVolume: map[d].longVolume,
      shortVolume: map[d].shortVolume,
      date: map[d].date,
    }));
  }, [dailyData, startOfWeek]);

  const maxVolume = Math.max(...weekData.map((d) => d.totalVolume));

  // Format week range for display
  const weekRange = useMemo(() => {
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const formatOptions = { day: "numeric", month: "short" };
    const startFormatted = startOfWeek.toLocaleDateString(
      "en-US",
      formatOptions,
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

  // 🎨 Custom Tooltip (styled like your PnL tooltip)
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      const { totalVolume, longVolume, shortVolume, day, date } =
        payload[0].payload;

      return (
        <div className="boxBg tooltip font_12 flexClm gap_12">
          <div className="pnl-tooltip-header">
            {day} {date && `(${date})`}
          </div>

          <div className="flexClm gap_6">
            <div className="positive">{formatNumber(longVolume)} Long</div>
            <div className="negative">{formatNumber(shortVolume)} Short</div>
            <div
              className="total-volume"
              style={{
                borderTop: "1px solid var(--black-10)",
                paddingTop: "6px",
                marginTop: "2px",
              }}
            >
              Total: {formatNumber(totalVolume)}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart_container stats-card radius-12">
      <span className="card-value">Weekly volume chart</span>

      {/* Navigation Header */}
      <div className="flexRow flexRow_stretch font_12">
        <button
          onClick={handlePreviousWeek}
          className="btn flexRow"
          aria-label="Previous week"
          style={{ minWidth: "fit-content", maxWidth: "fit-content" }}
        >
          <ChevronLeft size={14} color="black" />
        </button>

        <div className="flexRow gap_12">
          <span className="card-value">{weekRange}</span>
          {weekOffset !== 0 && (
            <button onClick={handleCurrentWeek} className="btn">
              Current Week
            </button>
          )}
        </div>

        <button
          onClick={handleNextWeek}
          className="btn flexRow"
          aria-label="Next week"
          style={{ minWidth: "fit-content", maxWidth: "fit-content" }}
        >
          <ChevronRight size={14} color="black" />
        </button>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <BarChart
          data={weekData}
          barCategoryGap="30%"
          margin={{ top: 20, bottom: 20 }}
        >
          <defs>
            <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#3B82F680" stopOpacity={0.5} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={({ x, y, payload }) => {
              const today = new Date();
              const currentDayIndex = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

              // Map Sunday = 0 to "Sun", Monday = 1 to "Mon", ...
              const daysMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
              const isToday = payload.value === daysMap[currentDayIndex];

              return (
                <text
                  x={x}
                  y={y + 16} // dy equivalent
                  textAnchor="middle"
                  className={isToday ? "" : "shade_50"}
                  fontSize={12}
                  fill={isToday ? "var(--black)" : "var(--black-50)"}
                >
                  {payload.value}
                </text>
              );
            }}
          />

          <YAxis hide domain={[0, (dataMax) => dataMax * 1.2]} />

          <ReferenceLine y={0} stroke="#aaa" strokeDasharray="3 3" />

          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#ffffff10" }} />

          <Bar
            dataKey="totalVolume"
            radius={[12, 12, 0, 0]}
            fill="url(#volumeGradient)"
          >
            <LabelList
              dataKey="totalVolume"
              position="top"
              className="bar-label"
              formatter={(val) => {
                if (val === maxVolume) {
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
