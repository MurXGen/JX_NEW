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
import { useMemo } from "react";
import { formatNumber } from "@/utils/formatNumbers";

export default function PNLChart({ dailyData }) {
  const startOfWeek = useMemo(() => {
    const now = new Date();
    const day = now.getDay(); 
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.setDate(diff));
  }, []);

const weekData = useMemo(() => {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // startOfWeek is already Monday
  const map = Object.fromEntries(days.map((d, i) => {
    const dayDate = new Date(startOfWeek);
    dayDate.setDate(startOfWeek.getDate() + i); // add offset for each day
    return [
      d,
      { pnl: 0, date: dayDate.toLocaleDateString("en-US", { day: "numeric", month: "short" }) }
    ];
  }));

  dailyData.forEach(({ date, pnl }) => {
    const d = new Date(date);
    if (d >= startOfWeek) {
      const day = d.toLocaleDateString("en-US", { weekday: "short" });
      if (map[day] !== undefined) {
        map[day].pnl += pnl; // sum PnL
      }
    }
  });

  return days.map((d) => ({
    day: d,
    pnl: map[d].pnl,
    date: map[d].date, // ✅ always has a value now
  }));
}, [dailyData, startOfWeek]);


  const maxPnl = Math.max(...weekData.map((d) => d.pnl));
  const minPnl = Math.min(...weekData.map((d) => d.pnl));

  // 🎨 Custom Tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      const { pnl, day, date } = payload[0].payload;

      let pnlClass = "pnl-neutral";
      if (pnl > 0) pnlClass = "pnl-positive";
      else if (pnl < 0) pnlClass = "pnl-negative";

      return (
        <div className="pnl-tooltip">
          <div className="pnl-tooltip-header">
            {day} {date && `(${date})`}
          </div>
          <div className={`pnl-tooltip-value ${pnlClass}`}>
            {formatNumber(pnl)} PnL
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart
          data={weekData}
          barCategoryGap="30%"
          margin={{ top: 40, bottom: 20 }} // ✅ extra space for labels
        >
          <defs>
            <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22C55E" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#22C55E80" stopOpacity={0.5} />
            </linearGradient>
            <linearGradient id="pnlNegative" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EF444480" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#EF4444" stopOpacity={0.5} />
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

          <Tooltip content={<CustomTooltip />} />

          <Bar dataKey="pnl" radius={[20, 20, 20, 20]}>
            {weekData.map((entry, i) => (
              <Cell
                key={`cell-${i}`}
                fill={entry.pnl >= 0 ? "url(#pnlGradient)" : "url(#pnlNegative)"}
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
