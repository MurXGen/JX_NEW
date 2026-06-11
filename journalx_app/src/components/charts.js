import React, { useEffect, useState } from "react";
import { Pressable, View, Text } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import Svg, { Path, Defs, LinearGradient, Stop, Line, Circle, G } from "react-native-svg";
import { useTheme } from "../theme/ThemeProvider";
import { font } from "../theme/typography";
import { money, fmt } from "../lib/format";

/* horizontal progress bar (win rate, discipline, etc.) */
export function Progress({ pct = 0, color, height = 10 }) {
  const { theme } = useTheme();
  const v = Math.max(0, Math.min(100, pct));
  return (
    <View style={{ height, borderRadius: height, backgroundColor: theme.bg.muted, overflow: "hidden" }}>
      <View style={{ width: `${v}%`, height: "100%", borderRadius: height, backgroundColor: color || theme.primary }} />
    </View>
  );
}

/* animated progress bar — grows from 0 → pct on mount */
export function AnimatedProgress({ pct = 0, color, height = 10, delay = 0 }) {
  const { theme } = useTheme();
  const target = Math.max(0, Math.min(100, pct));
  const v = useSharedValue(0);
  useEffect(() => { v.value = withDelay(delay, withTiming(target, { duration: 750 })); }, [target]);
  const style = useAnimatedStyle(() => ({ width: `${v.value}%` }));
  return (
    <View style={{ height, borderRadius: height, backgroundColor: theme.bg.muted, overflow: "hidden" }}>
      <Animated.View style={[{ height: "100%", borderRadius: height, backgroundColor: color || theme.primary }, style]} />
    </View>
  );
}

/* donut chart with tappable segments (tap → onSlice) */
export function Donut({ segments = [], size = 150, onSlice }) {
  const { theme } = useTheme();
  const COLORS = [theme.yellow[400], theme.success, "#22d3ee", "#a78bfa", "#fb7185", theme.text.muted];
  const total = segments.reduce((s, x) => s + (x.value || 0), 0) || 1;
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {segments.map((seg, i) => {
            const frac = (seg.value || 0) / total;
            const dash = frac * c;
            const el = (
              <Circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={COLORS[i % COLORS.length]} strokeWidth="14"
                strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-offset} strokeLinecap="butt" />
            );
            offset += dash;
            return el;
          })}
        </G>
      </Svg>
      <View style={{ marginTop: 10, gap: 6, alignSelf: "stretch" }}>
        {segments.map((seg, i) => (
          <Pressable key={i} onPress={(e) => onSlice && onSlice(seg, COLORS[i % COLORS.length], total, e)} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS[i % COLORS.length] }} />
            <Text style={{ flex: 1, color: theme.text.secondary, fontSize: theme.font.small }}>{seg.label}</Text>
            <Text style={{ color: theme.text.primary, fontFamily: font(700), fontSize: theme.font.small }}>{fmt((seg.value / total) * 100, 0)}%</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/* Equity curve — area + line drawn with react-native-svg (works in Expo Go). */
export function EquityChart({ data = [], height = 160, sym = "$", onTap }) {
  const { theme } = useTheme();
  const [w, setW] = useState(0);

  const last = data[data.length - 1] || 0;
  const up = last >= 0;
  const stroke = up ? theme.success : theme.danger;

  let body = null;
  if (w > 0 && data.length > 1) {
    const min = Math.min(0, ...data);
    const max = Math.max(0, ...data);
    const range = max - min || 1;
    const stepX = w / (data.length - 1);
    const y = (v) => height - ((v - min) / range) * height;
    const pts = data.map((v, i) => [i * stepX, y(v)]);
    const line = pts.map(([x, yy], i) => `${i ? "L" : "M"}${x.toFixed(1)},${yy.toFixed(1)}`).join(" ");
    const area = `${line} L${w},${height} L0,${height} Z`;
    const zeroY = y(0);
    body = (
      <Svg width={w} height={height}>
        <Defs>
          <LinearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={stroke} stopOpacity="0.25" />
            <Stop offset="1" stopColor={stroke} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Line x1="0" y1={zeroY} x2={w} y2={zeroY} stroke={theme.border} strokeWidth="1" strokeDasharray="4 4" />
        <Path d={area} fill="url(#eq)" />
        <Path d={line} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
    );
  }

  return (
    <Pressable onPress={(e) => data.length > 1 && onTap && onTap(`Equity ${money(last, sym)} after ${data.length} closed trades`, e)} onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height, width: "100%" }}>
      {data.length > 1 ? (
        body
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: theme.text.muted, fontSize: theme.font.small }}>
            Log a few trades to see your equity curve.
          </Text>
        </View>
      )}
    </Pressable>
  );
}

/* Candlestick equity chart — groups the cumulative-equity series into OHLC
   candles so the dashboard equity looks like the web's "equity growth candles".
   Tap a candle for its tooltip. */
export function EquityCandles({ equity = [], height = 180, sym = "$", onTap, maxCandles = 22 }) {
  const { theme } = useTheme();
  const [w, setW] = useState(0);

  if (equity.length < 2) {
    return (
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: theme.text.muted, fontSize: theme.font.small }}>Log a few trades to see your equity candles.</Text>
      </View>
    );
  }

  // group consecutive equity points into candles
  const chunk = Math.max(1, Math.ceil(equity.length / maxCandles));
  const candles = [];
  let prevClose = equity[0];
  for (let i = 0; i < equity.length; i += chunk) {
    const slice = equity.slice(i, i + chunk);
    const open = candles.length === 0 ? slice[0] : prevClose;
    const close = slice[slice.length - 1];
    const high = Math.max(open, ...slice);
    const low = Math.min(open, ...slice);
    candles.push({ open, close, high, low, n: slice.length, end: i + slice.length });
    prevClose = close;
  }

  const lo = Math.min(...candles.map((c) => c.low));
  const hi = Math.max(...candles.map((c) => c.high));
  const range = hi - lo || 1;
  const y = (v) => height - ((v - lo) / range) * (height - 10) - 5;
  const slot = w > 0 ? w / candles.length : 0;
  const bodyW = Math.max(3, Math.min(14, slot * 0.6));

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height, width: "100%" }}>
      {w > 0 && (
        <Svg width={w} height={height}>
          <Line x1="0" y1={y(0)} x2={w} y2={y(0)} stroke={theme.border} strokeWidth="1" strokeDasharray="4 4" />
          {candles.map((c, i) => {
            const cx = i * slot + slot / 2;
            const up = c.close >= c.open;
            const color = up ? theme.success : theme.danger;
            const bodyTop = y(Math.max(c.open, c.close));
            const bodyH = Math.max(2, Math.abs(y(c.open) - y(c.close)));
            return (
              <G key={i}>
                <Line x1={cx} y1={y(c.high)} x2={cx} y2={y(c.low)} stroke={color} strokeWidth="1.5" />
                <Path d={`M ${cx - bodyW / 2} ${bodyTop} h ${bodyW} v ${bodyH} h ${-bodyW} Z`} fill={color} />
              </G>
            );
          })}
        </Svg>
      )}
      {/* invisible touch columns for tooltips */}
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, flexDirection: "row" }}>
        {candles.map((c, i) => (
          <Pressable key={i} onPress={(e) => onTap && onTap(`Equity ${money(c.close, sym)} (candle ${i + 1}/${candles.length})`, e)} style={{ flex: 1 }} />
        ))}
      </View>
    </View>
  );
}

/* Day-of-week P&L bars — tap a bar to show its tooltip. */
export function DowBars({ data = [], sym = "$", height = 150, onBar }) {
  const { theme } = useTheme();
  const max = Math.max(1, ...data.map((d) => Math.abs(d.pnl)));
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", height, gap: 8 }}>
      {data.map((d) => {
        const empty = d.n === 0;
        const h = empty ? 6 : Math.max(8, Math.round((Math.abs(d.pnl) / max) * (height - 40)));
        const pos = d.pnl >= 0;
        return (
          <Pressable
            key={d.label}
            onPress={(e) => onBar && onBar(empty ? `${d.label}: 0 trades` : `${d.label}: ${money(d.pnl, sym)} over ${d.n} trade${d.n === 1 ? "" : "s"}`, e)}
            style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 6 }}
          >
            <Text style={{ fontSize: 10, fontFamily: font(700), color: empty ? theme.text.muted : pos ? theme.successStrong : theme.dangerStrong }}>
              {empty ? "—" : money(d.pnl, sym).replace("+", "")}
            </Text>
            <View style={{ width: "100%", height: h, borderRadius: 6, backgroundColor: empty ? theme.border : pos ? theme.success : theme.danger }} />
            <Text style={{ fontSize: 11, color: theme.text.muted, fontFamily: font(600) }}>{d.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* daily net P&L bars (recent days) — tappable, zero baseline in the middle. */
export function DailyBars({ data = [], sym = "$", height = 150, onBar }) {
  const { theme } = useTheme();
  const max = Math.max(1, ...data.map((d) => Math.abs(d.pnl)));
  const half = (height - 24) / 2;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", height, gap: 4 }}>
      {data.map((d) => {
        const dt = new Date(d.t);
        const pos = d.pnl >= 0;
        const h = Math.max(4, Math.round((Math.abs(d.pnl) / max) * half));
        return (
          <Pressable
            key={d.t}
            onPress={(e) => onBar && onBar(`${dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}: ${money(d.pnl, sym)} · ${d.n} trade${d.n === 1 ? "" : "s"}`, e)}
            style={{ flex: 1, height, alignItems: "center", justifyContent: "center" }}
          >
            <View style={{ flex: 1, width: "100%", justifyContent: "flex-end", alignItems: "center", paddingBottom: 1 }}>
              {pos && <View style={{ width: "70%", height: h, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: theme.success }} />}
            </View>
            <View style={{ height: 1, alignSelf: "stretch", backgroundColor: theme.border }} />
            <View style={{ flex: 1, width: "100%", justifyContent: "flex-start", alignItems: "center", paddingTop: 1 }}>
              {!pos && <View style={{ width: "70%", height: h, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, backgroundColor: theme.danger }} />}
              <Text style={{ fontSize: 9, color: theme.text.muted, marginTop: 2 }}>{dt.getDate()}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/* horizontal per-symbol P&L bars — tappable. */
export function SymbolBars({ data = [], symMax = 1, sym = "$", onBar }) {
  const { theme } = useTheme();
  return (
    <View style={{ gap: 10 }}>
      {data.map((s) => {
        const pos = s.pnl >= 0;
        const w = Math.max(6, (Math.abs(s.pnl) / symMax) * 100);
        return (
          <Pressable key={s.sym} onPress={(e) => onBar && onBar(`${s.sym}: ${money(s.pnl, sym)} over ${s.n} trade${s.n === 1 ? "" : "s"}`, e)} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ width: 54, color: theme.text.secondary, fontSize: theme.font.small, fontFamily: font(600) }} numberOfLines={1}>{s.sym.split("/")[0]}</Text>
            <View style={{ flex: 1, height: 12, borderRadius: 6, backgroundColor: theme.bg.muted, overflow: "hidden" }}>
              <View style={{ width: `${w}%`, height: "100%", borderRadius: 6, backgroundColor: pos ? theme.success : theme.danger }} />
            </View>
            <Text style={{ width: 64, textAlign: "right", color: pos ? theme.successStrong : theme.dangerStrong, fontFamily: font(700), fontSize: theme.font.small }}>{money(s.pnl, sym)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
