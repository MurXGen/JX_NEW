/* Activity heatmap with Month / Year views.
   - Month: a calendar grid for the selected month, cells tinted by daily net P&L.
   - Year: 12 mini-month grids, 2 per row, for the selected year.
   Navigate with ‹ › ; toggle Month/Year above. */
import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useTheme } from "../theme/ThemeProvider";
import { font } from "../theme/typography";

function buildByDay(trades) {
  const map = {};
  trades.forEach((t) => {
    const d = new Date(t.closeTime || t.openTime);
    if (Number.isNaN(d.getTime())) return;
    const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const e = map[k] || { n: 0, pnl: 0 };
    e.n += 1; e.pnl += Number(t.pnl) || 0;
    map[k] = e;
  });
  return map;
}

function MonthGrid({ year, month, byDay, theme, compact }) {
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  const cellGap = compact ? 2 : 3;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
      {cells.map((d, i) => {
        if (!d) return <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: cellGap / 2 }} />;
        const e = byDay[`${year}-${month}-${d}`];
        const has = !!e;
        const pos = (e?.pnl || 0) >= 0;
        const bg = !has ? theme.bg.muted : pos ? theme.success : theme.danger;
        const op = !has ? 1 : 0.45 + Math.min(0.55, (e.n || 1) * 0.18);
        return (
          <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: cellGap / 2 }}>
            <View style={{ flex: 1, borderRadius: compact ? 2 : 5, backgroundColor: bg, opacity: op, alignItems: "center", justifyContent: "center" }}>
              {!compact && <Text style={{ fontSize: 9, color: has ? "#fff" : theme.text.muted, fontFamily: font(has ? 700 : 400) }}>{d}</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function Heatmap({ trades = [] }) {
  const { theme } = useTheme();
  const byDay = useMemo(() => buildByDay(trades), [trades]);
  const [mode, setMode] = useState("month"); // month | year
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const step = (dir) => {
    if (mode === "year") { setYear((y) => y + dir); return; }
    let m = month + dir, y = year;
    if (m < 0) { m = 11; y -= 1; } else if (m > 11) { m = 0; y += 1; }
    setMonth(m); setYear(y);
  };
  const label = mode === "year" ? `${year}` : `${MONTHS[month]} ${year}`;

  return (
    <View>
      {/* header: mode toggle + nav */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: theme.space[3] }}>
        <View style={{ flexDirection: "row", backgroundColor: theme.bg.muted, borderRadius: theme.radius.md, padding: 3 }}>
          {["month", "year"].map((m) => {
            const active = mode === m;
            return (
              <Pressable key={m} onPress={() => setMode(m)} style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: theme.radius.sm, backgroundColor: active ? theme.bg.surface : "transparent" }}>
                <Text style={{ color: active ? theme.text.primary : theme.text.muted, fontFamily: font(600), fontSize: theme.font.small, textTransform: "capitalize" }}>{m}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable onPress={() => step(-1)} hitSlop={8}><ChevronLeft size={20} color={theme.text.muted} /></Pressable>
          <Text style={{ fontFamily: font(700), color: theme.text.primary, fontSize: theme.font.body, minWidth: 70, textAlign: "center" }}>{label}</Text>
          <Pressable onPress={() => step(1)} hitSlop={8}><ChevronRight size={20} color={theme.text.muted} /></Pressable>
        </View>
      </View>

      {mode === "month" ? (
        <>
          <View style={{ flexDirection: "row", marginBottom: 4 }}>
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <Text key={i} style={{ flex: 1, textAlign: "center", fontSize: 10, color: theme.text.muted, fontFamily: font(600) }}>{d}</Text>
            ))}
          </View>
          <MonthGrid year={year} month={month} byDay={byDay} theme={theme} />
        </>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {MONTHS.map((mn, mi) => (
            <View key={mi} style={{ width: "50%", padding: 6 }}>
              <Text style={{ fontSize: 11, color: theme.text.secondary, fontFamily: font(600), marginBottom: 4 }}>{mn}</Text>
              <MonthGrid year={year} month={mi} byDay={byDay} theme={theme} compact />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
