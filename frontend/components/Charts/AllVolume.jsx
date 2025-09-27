"use client";

import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  YAxis,
  LabelList,
} from "recharts";
import { useMemo, useState } from "react";
import { formatNumber } from "@/utils/formatNumbers";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function VolumeChart({ dailyData }) {
  const [weekOffset, setWeekOffset] = useState(0);

  // Calculate start of the week (Monday)
  const startOfWeek = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(now.setDate(diff));
    start.setDate(start.getDate() + weekOffset * 7);
    start.setHours(0, 0, 0, 0);
    return start;
  }, [weekOffset]);

  // Build week data with separate long and short volumes
  const weekData = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return days.map((d, i) => {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(startOfWeek.getDate() + i);

      const dateKey = dayDate.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      const dayTrades = dailyData.filter((item) => item.date === dateKey);
      let totalVolume = 0;

      dayTrades.forEach((t) => {
        const longV = t.longVolume || 0;
        const shortV = t.shortVolume || 0;
        totalVolume += longV + shortV;
      });

      return {
        day: d,
        date: dayDate.toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
        }),
        totalVolume,
      };
    });
  }, [dailyData, startOfWeek]);

  const maxVolume = Math.max(...weekData.map((d) => d.longVolume));
  const maxShortVolume = Math.max(...weekData.map((d) => d.shortVolume));

  // Week range for header
  const weekRange = useMemo(() => {
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    const fmt = { day: "numeric", month: "short" };
    return `${startOfWeek.toLocaleDateString(
      "en-US",
      fmt
    )} - ${endOfWeek.toLocaleDateString("en-US", fmt)}`;
  }, [startOfWeek]);

  const handlePreviousWeek = () => setWeekOffset((prev) => prev - 1);
  const handleNextWeek = () => setWeekOffset((prev) => prev + 1);
  const handleCurrentWeek = () => setWeekOffset(0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      const { day, date, longVolume, shortVolume } = payload[0].payload;
      return (
        <div className="boxBg font_12 flexClm gap_6">
          <div>
            {day} {date && `(${date})`}
          </div>
          <div className="positive">{formatNumber(longVolume)} Long</div>
          <div className="negative">{formatNumber(shortVolume)} Short</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-container daily-volume-chart-container">
      {/* Navigation */}
      <div className="flexRow flexRow_stretch font_12">
        <button onClick={handlePreviousWeek} className="button_ter flexRow">
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

        <button onClick={handleNextWeek} className="button_ter flexRow">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={250}>
        <BarChart
          data={weekData}
          barCategoryGap="30%"
          margin={{ top: 40, bottom: 20 }}
        >
          <defs>
            <linearGradient id="volTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#3B82F680" stopOpacity={0.5} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, dy: 16, fill: "#888" }}
          />
          <YAxis hide />
          <ReferenceLine y={0} stroke="#aaa" strokeDasharray="3 3" />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload?.length) {
                const { day, date, totalVolume } = payload[0].payload;
                return (
                  <div className="boxBg font_12 flexClm gap_6">
                    <div>
                      {day} {date && `(${date})`}
                    </div>
                    <div>Total Volume: {formatNumber(totalVolume)}</div>
                  </div>
                );
              }
              return null;
            }}
            cursor={{ fill: "#ffffff10" }}
          />

          <Bar
            dataKey="totalVolume"
            radius={[12, 12, 0, 0]}
            fill="url(#volTotal)"
          >
            <LabelList
              dataKey="totalVolume"
              position="top"
              className="bar-label"
              formatter={(val) => formatNumber(val)}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
