"use client";

import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer,ReferenceLine, YAxis, Cell, LabelList } from "recharts";
import { useMemo } from "react";
import { formatNumber } from "@/utils/formatNumbers"; // your utility

export default function PNLChart({ dailyData }) {
  // 🗓 Get Monday of current week
  const startOfWeek = useMemo(() => {
    const now = new Date();
    const day = now.getDay(); // 0=Sun,1=Mon...
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.setDate(diff));
  }, []);

  // 📊 Prepare weekly data
  const weekData = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const map = Object.fromEntries(days.map((d) => [d, { pnl: 0, date: null }]));

    dailyData.forEach(({ date, pnl }) => {
      const d = new Date(date);
      if (d >= startOfWeek) {
        const day = d.toLocaleDateString("en-US", { weekday: "short" });
        if (map[day] !== undefined) {
          map[day].pnl += pnl;
          map[day].date = d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
        }
      }
    });

    return days.map((d) => ({
      day: d,
      pnl: map[d].pnl,
      date: map[d].date || "",
    }));
  }, [dailyData, startOfWeek]);

  // 📌 Find max & min pnl for labeling
  const maxPnl = Math.max(...weekData.map((d) => d.pnl));
  const minPnl = Math.min(...weekData.map((d) => d.pnl));

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={weekData} barCategoryGap="30%" margin={{ bottom: 20 }}>
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

          {/* X Axis with margin below */}
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, dy: 16, fill: "#888" }}
          />

          {/* Y Axis (hidden ticks but keeps scale for ReferenceLine) */}
          <YAxis hide />

          {/* Horizontal line at 0 PnL */}
          <ReferenceLine y={0} stroke="#aaa" strokeDasharray="3 3" />

          {/* Tooltip */}
          <Tooltip
            formatter={(value, name, props) => {
              const payload = props?.payload || {};
              return [`${formatNumber(value)} PnL`, `${payload.day || ""} (${payload.date || ""})`];
            }}
            contentStyle={{
              background: "#111",
              borderRadius: "8px",
              border: "none",
              color: "#fff",
            }}
          />

          {/* Bars */}
          <Bar dataKey="pnl" radius={[20, 20, 20, 20]}>
            {weekData.map((entry, i) => (
              <Cell
                key={`cell-${i}`}
                fill={entry.pnl >= 0 ? "url(#pnlGradient)" : "url(#pnlNegative)"}
              />
            ))}

            {/* Labels only for max/min */}
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
