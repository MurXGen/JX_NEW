/* Monthly P&L calendar — colour-codes each day by net P&L (mirrors the web
   calendar). Pure Views, no svg. Prev/next month navigation. */
import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useTheme } from "../theme/ThemeProvider";
import { font } from "../theme/typography";
import { money } from "../lib/format";

const WD = ["S", "M", "T", "W", "T", "F", "S"];

export default function PnlCalendar({ trades = [], sym = "$" }) {
  const { theme } = useTheme();
  const [offset, setOffset] = useState(0); // months back/forward from current

  const view = useMemo(() => {
    const base = new Date();
    base.setMonth(base.getMonth() + offset);
    const year = base.getFullYear();
    const month = base.getMonth();
    const first = new Date(year, month, 1);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // net P&L per day-of-month for this month
    const perDay = {};
    trades.forEach((t) => {
      const d = new Date(t.closeTime || t.openTime);
      if (Number.isNaN(d.getTime())) return;
      if (d.getFullYear() !== year || d.getMonth() !== month) return;
      const day = d.getDate();
      perDay[day] = (perDay[day] || 0) + (Number(t.pnl) || 0);
    });

    const cells = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) cells.push({ day, pnl: perDay[day] });

    const monthLabel = base.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const monthNet = Object.values(perDay).reduce((s, v) => s + v, 0);
    return { cells, monthLabel, monthNet, hasData: Object.keys(perDay).length > 0 };
  }, [trades, offset]);

  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: theme.space[3] }}>
        <Pressable onPress={() => setOffset((o) => o - 1)} hitSlop={10}><ChevronLeft size={20} color={theme.text.muted} /></Pressable>
        <Text style={{ fontFamily: font(700), fontSize: theme.font.bodyMd, color: theme.text.primary }}>{view.monthLabel}</Text>
        <Pressable onPress={() => setOffset((o) => Math.min(0, o + 1))} hitSlop={10}><ChevronRight size={20} color={offset >= 0 ? theme.border : theme.text.muted} /></Pressable>
      </View>

      <View style={{ flexDirection: "row", marginBottom: 6 }}>
        {WD.map((d, i) => (
          <Text key={i} style={{ flex: 1, textAlign: "center", fontFamily: font(600), fontSize: 11, color: theme.text.muted }}>{d}</Text>
        ))}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {view.cells.map((c, i) => {
          if (!c) return <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />;
          const has = c.pnl != null;
          const pos = (c.pnl || 0) >= 0;
          const bg = !has ? "transparent" : pos ? theme.successSubtle : theme.dangerSubtle;
          const fg = !has ? theme.text.muted : pos ? theme.successStrong : theme.dangerStrong;
          return (
            <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2 }}>
              <View style={{ flex: 1, borderRadius: 8, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontFamily: font(has ? 700 : 400), fontSize: 12, color: has ? fg : theme.text.secondary }}>{c.day}</Text>
                {has && (
                  <Text style={{ fontFamily: font(600), fontSize: 8, color: fg }} numberOfLines={1}>
                    {money(c.pnl, sym).replace("+", "")}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {view.hasData && (
        <Text style={{ marginTop: theme.space[3], textAlign: "right", fontFamily: font(700), color: view.monthNet >= 0 ? theme.successStrong : theme.dangerStrong }}>
          Month: {money(view.monthNet, sym)}
        </Text>
      )}
    </View>
  );
}
