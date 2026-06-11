import React, { useState } from "react";
import { View, Text } from "react-native";
import Svg, { Path, Defs, LinearGradient, Stop, Line } from "react-native-svg";
import { useTheme } from "../theme/ThemeProvider";
import { money } from "../lib/format";

/* Equity curve — area + line drawn with react-native-svg (works in Expo Go). */
export function EquityChart({ data = [], height = 160 }) {
  const { theme } = useTheme();
  const [w, setW] = useState(0);

  const up = (data[data.length - 1] || 0) >= 0;
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
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height, width: "100%" }}>
      {data.length > 1 ? (
        body
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: theme.text.muted, fontSize: theme.font.small }}>
            Log a few trades to see your equity curve.
          </Text>
        </View>
      )}
    </View>
  );
}

/* Day-of-week P&L bars (Views, no svg needed). */
export function DowBars({ data = [], sym = "$", height = 150 }) {
  const { theme } = useTheme();
  const max = Math.max(1, ...data.map((d) => Math.abs(d.pnl)));
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", height, gap: 8 }}>
      {data.map((d) => {
        const empty = d.n === 0;
        const h = empty ? 6 : Math.max(8, Math.round((Math.abs(d.pnl) / max) * (height - 40)));
        const pos = d.pnl >= 0;
        return (
          <View key={d.label} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
            <Text style={{ fontSize: 10, fontWeight: "700", color: empty ? theme.text.muted : pos ? theme.successStrong : theme.dangerStrong }}>
              {empty ? "—" : money(d.pnl, sym).replace("+", "")}
            </Text>
            <View
              style={{
                width: "100%",
                height: h,
                borderRadius: 6,
                backgroundColor: empty ? theme.border : pos ? theme.success : theme.danger,
              }}
            />
            <Text style={{ fontSize: 11, color: theme.text.muted, fontWeight: "600" }}>{d.label}</Text>
          </View>
        );
      })}
    </View>
  );
}
