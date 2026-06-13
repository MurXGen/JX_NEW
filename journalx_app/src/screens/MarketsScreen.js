/* Markets — mirrors the web MarketsPanel: ticker tape, market sessions clock,
   "if you traded today" forecast (from the user's own history), most-traded
   symbol quotes, heatmaps (crypto/stocks/forex), economic calendar & news. */
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Clock, Sparkles, TrendingDown, TrendingUp } from "lucide-react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useApp } from "../context/AppContext";
import { H1, Muted, Badge, Card } from "../components/ui";
import Accordion from "../components/Accordion";
import TvWidget from "../components/TvWidget";
import { font } from "../theme/typography";
import { fmt, currencySymbol, money } from "../lib/format";

/* ---- market sessions (UTC windows) ---- */
const SESSIONS = [
  { name: "Sydney", open: 21, close: 6 },
  { name: "Asia (Tokyo)", open: 0, close: 9 },
  { name: "London", open: 7, close: 16 },
  { name: "New York", open: 13, close: 22 },
];
const isOpen = (s, h) => (s.open < s.close ? h >= s.open && h < s.close : h >= s.open || h < s.close);

function SessionClock({ t }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(id); }, []);
  const utcH = now.getUTCHours() + now.getUTCMinutes() / 60;
  return (
    <Card style={{ gap: t.space[3] }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Clock size={16} color={t.accent.text} />
        <Text style={{ fontFamily: font(700), fontSize: t.font.title, color: t.text.primary }}>Market sessions</Text>
        <Text style={{ marginLeft: "auto", textAlign: "right", color: t.text.muted, fontSize: t.font.caption }}>
          {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} local{"\n"}
          {now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC
        </Text>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.space[2] }}>
        {SESSIONS.map((s) => {
          const open = isOpen(s, utcH);
          return (
            <View key={s.name} style={{ flexGrow: 1, flexBasis: "47%", backgroundColor: t.bg.muted, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.border, padding: t.space[3], gap: 5 }}>
              <Text style={{ fontFamily: font(600), fontSize: t.font.bodyMd, color: t.text.primary }}>{s.name}</Text>
              <Badge tone={open ? "success" : "neutral"}>{open ? "● Open" : "Closed"}</Badge>
              <Text style={{ color: t.text.muted, fontSize: t.font.caption }}>
                {String(s.open).padStart(2, "0")}:00–{String(s.close).padStart(2, "0")}:00 UTC
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

/* ---- "If you traded today" forecast from the user's own history ---- */
function EdgeForecast({ t, trades, sym }) {
  const forecasts = useMemo(() => {
    const bySym = new Map();
    trades.forEach((tr) => {
      const entry = Number(tr.avgEntryPrice || tr.entryPrice || tr.entries?.[0]?.price);
      const exit = Number(tr.avgExitPrice || tr.exitPrice || tr.exits?.[0]?.price);
      if (!tr.closeTime || !entry || !exit) return;
      const s = tr.symbol || tr.ticker;
      if (!s) return;
      if (!bySym.has(s)) bySym.set(s, []);
      bySym.get(s).push({ ...tr, entry, exit });
    });
    return [...bySym.entries()]
      .filter(([, list]) => list.length >= 2)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 3)
      .map(([symbol, list]) => {
        const sorted = [...list].sort((a, b) => new Date(a.closeTime) - new Date(b.closeTime));
        const last = sorted[sorted.length - 1];
        const lastPrice = last.exit;
        const moves = sorted.map((tr) => {
          const dir = tr.direction?.toLowerCase() === "long" ? 1 : -1;
          return (dir * (tr.exit - tr.entry)) / tr.entry;
        });
        const avgMove = moves.reduce((s, v) => s + v, 0) / moves.length;
        const sd = moves.length > 1
          ? Math.sqrt(moves.reduce((s, v) => s + (v - avgMove) ** 2, 0) / (moves.length - 1))
          : Math.abs(avgMove);
        const longs = sorted.filter((tr) => tr.direction?.toLowerCase() === "long").length;
        const bias = longs >= sorted.length / 2 ? "long" : "short";
        const dir = bias === "long" ? 1 : -1;
        const wins = sorted.filter((tr) => tr.pnl > 0).length;
        const evPnl = sorted.reduce((s, tr) => s + (Number(tr.pnl) || 0), 0) / sorted.length;
        return {
          symbol, n: sorted.length, bias, winRate: (wins / sorted.length) * 100, evPnl,
          lastPrice, predicted: lastPrice * (1 + dir * avgMove),
          lo: lastPrice * (1 + dir * avgMove - sd), hi: lastPrice * (1 + dir * avgMove + sd),
          avgMovePct: avgMove * 100,
        };
      });
  }, [trades]);

  if (!forecasts.length) return null;
  return (
    <Card style={{ gap: t.space[3] }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Sparkles size={16} color={t.accent.text} />
        <Text style={{ fontFamily: font(700), fontSize: t.font.title, color: t.text.primary }}>If you traded today</Text>
      </View>
      <Text style={{ color: t.text.muted, fontSize: t.font.caption, marginTop: -4 }}>Projected from your own history — not financial advice</Text>
      <View style={{ gap: t.space[3] }}>
        {forecasts.map((f) => {
          const good = (f.predicted >= f.lastPrice) === (f.bias === "long");
          return (
            <View key={f.symbol} style={{ backgroundColor: t.bg.muted, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.border, padding: t.space[4], gap: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ fontFamily: font(700), fontSize: t.font.title, color: t.text.primary }}>{f.symbol}</Text>
                <Badge tone={f.bias === "long" ? "success" : "danger"}>{f.bias === "long" ? "▲" : "▼"} {f.bias}</Badge>
              </View>
              <Text style={{ color: t.text.muted, fontSize: t.font.caption }}>Projected exit if entered near {sym}{fmt(f.lastPrice, 2)}</Text>
              <Text style={{ fontFamily: font(800), fontSize: t.font.h3, color: good ? t.successStrong : t.dangerStrong }}>{sym}{fmt(f.predicted, 2)}</Text>
              <Text style={{ color: t.text.muted, fontSize: t.font.caption }}>
                Range {sym}{fmt(f.lo, 2)} – {sym}{fmt(f.hi, 2)} · you capture {f.avgMovePct >= 0 ? "+" : ""}{fmt(f.avgMovePct, 2)}%
              </Text>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
                <Badge tone={f.evPnl >= 0 ? "success" : "danger"}>EV {f.evPnl >= 0 ? "+" : "−"}{sym}{fmt(Math.abs(f.evPnl), 0)}/trade</Badge>
                <Badge tone="neutral">{fmt(f.winRate, 0)}% win · {f.n} trades</Badge>
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const toTvSymbol = (sym) => {
  const s = (sym || "").toUpperCase().replace("/", "");
  if (s.endsWith("USDT") || s.endsWith("USDC")) return `BINANCE:${s}`;
  if (s.endsWith("USD") && s.length <= 7) return `OANDA:${s.slice(0, 3)}${s.slice(3)}`;
  return null;
};

const HEATMAPS = {
  crypto: { script: "crypto-coins-heatmap", config: { dataSource: "Crypto", blockSize: "market_cap_calc", blockColor: "change", hasTopBar: true, isZoomEnabled: true, hasSymbolTooltip: true } },
  stocks: { script: "stock-heatmap", config: { exchanges: [], dataSource: "SPX500", grouping: "sector", blockSize: "market_cap_basic", blockColor: "change", hasTopBar: true, isZoomEnabled: true, hasSymbolTooltip: true } },
  forex: { script: "forex-heat-map", config: { currencies: ["EUR", "USD", "JPY", "GBP", "CHF", "AUD", "CAD", "INR"] } },
};

function Seg({ t, value, onChange, options }) {
  return (
    <View style={{ flexDirection: "row", backgroundColor: t.bg.muted, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.border, padding: 3 }}>
      {options.map(([id, label]) => {
        const active = value === id;
        return (
          <Pressable key={id} onPress={() => onChange(id)} style={{ flex: 1, paddingVertical: 8, borderRadius: t.radius.sm, alignItems: "center", backgroundColor: active ? t.primary : "transparent" }}>
            <Text style={{ color: active ? t.primaryText : t.text.secondary, fontFamily: font(active ? 700 : 500), fontSize: t.font.small }}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function MarketsScreen() {
  const { theme: t } = useTheme();
  const { trades, currentAccount } = useApp();
  const sym = currencySymbol(currentAccount?.currency);
  const [heatmapKind, setHeatmapKind] = useState("crypto");

  const topSymbols = useMemo(() => {
    const count = new Map();
    trades.forEach((tr) => { const s = tr.symbol || tr.ticker; if (s) count.set(s, (count.get(s) || 0) + 1); });
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => toTvSymbol(s)).filter(Boolean).slice(0, 4);
  }, [trades]);

  const hm = HEATMAPS[heatmapKind];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg.canvas }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: t.space[5], paddingBottom: 120, gap: t.space[4] }} showsVerticalScrollIndicator={false}>
        <View>
          <H1>Markets</H1>
          <Muted>Live market context for your next session — heatmaps, calendar & news.</Muted>
        </View>

        {/* ticker tape */}
        <TvWidget
          height={52}
          script="ticker-tape"
          config={{
            symbols: [
              { proName: "BINANCE:BTCUSDT", title: "Bitcoin" },
              { proName: "BINANCE:ETHUSDT", title: "Ethereum" },
              { proName: "FOREXCOM:SPXUSD", title: "S&P 500" },
              { proName: "FOREXCOM:NSXUSD", title: "Nasdaq 100" },
              { proName: "OANDA:XAUUSD", title: "Gold" },
              { proName: "TVC:DXY", title: "DXY" },
            ],
            showSymbolLogo: true,
            displayMode: "adaptive",
          }}
        />

        {/* sessions */}
        <SessionClock t={t} />

        {/* your-history forecast */}
        <EdgeForecast t={t} trades={trades} sym={sym} />

        {/* most-traded symbols */}
        {topSymbols.length > 0 && (
          <Accordion title="Your most-traded symbols" icon={TrendingUp}>
            <View style={{ gap: t.space[3] }}>
              {topSymbols.map((s) => (
                <TvWidget key={s} height={120} script="single-quote" config={{ symbol: s }} />
              ))}
            </View>
          </Accordion>
        )}

        {/* heatmap */}
        <Accordion title="Heatmap" icon={TrendingDown}>
          <View style={{ gap: t.space[3] }}>
            <Seg t={t} value={heatmapKind} onChange={setHeatmapKind} options={[["crypto", "Crypto"], ["stocks", "Stocks"], ["forex", "Forex"]]} />
            <TvWidget key={heatmapKind} height={460} script={hm.script} config={hm.config} />
          </View>
        </Accordion>

        {/* economic calendar */}
        <View style={{ gap: t.space[2] }}>
          <Text style={{ fontFamily: font(700), fontSize: t.font.bodyMd, color: t.text.primary }}>Economic calendar</Text>
          <TvWidget height={520} script="events" config={{ importanceFilter: "0,1", countryFilter: "us,eu,gb,jp,in,cn" }} />
        </View>

        {/* news */}
        <View style={{ gap: t.space[2] }}>
          <Text style={{ fontFamily: font(700), fontSize: t.font.bodyMd, color: t.text.primary }}>Top stories</Text>
          <TvWidget height={520} script="timeline" config={{ feedMode: "all_symbols", displayMode: "regular" }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
