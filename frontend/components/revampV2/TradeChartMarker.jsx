"use client";

/* Renders a candlestick chart with the trade's entry/exit/SL/TP marked,
   for trades that came from TradingView (no screenshots). Uses
   lightweight-charts; pulls real klines from Binance public API for
   crypto symbols, otherwise draws a synthetic path between entry/exit. */

import { useEffect, useRef, useState } from "react";
import { createChart } from "lightweight-charts";
import { toBinanceSymbol } from "@/utils/livePrice";

const TF_MS = { "1": 60e3, "5": 3e5, "15": 9e5, "60": 36e5, "240": 144e5, "D": 864e5, "1D": 864e5, "1H": 36e5, "4H": 144e5, "15m": 9e5, "5m": 3e5, "1m": 60e3 };
const tvToBinanceInterval = (tf) => {
  const map = { "1": "1m", "5": "5m", "15": "15m", "60": "1h", "240": "4h", "D": "1d", "1D": "1d", "1H": "1h", "4H": "4h", "15m": "15m", "5m": "5m", "1m": "1m" };
  return map[tf] || "1h";
};

async function fetchKlines(symbol, interval, fromMs, toMs) {
  const b = toBinanceSymbol(symbol);
  if (!b) return null;
  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=${b}&interval=${interval}&startTime=${Math.floor(fromMs)}&endTime=${Math.floor(toMs)}&limit=500`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const rows = await res.json();
    return rows.map((r) => ({
      time: Math.floor(r[0] / 1000),
      open: +r[1], high: +r[2], low: +r[3], close: +r[4],
    }));
  } catch {
    return null;
  }
}

/* synthetic candles between entry and exit when no live data */
function synthSeries(entry, exit, t0, t1) {
  const n = 40;
  const span = (t1 - t0) || 36e5 * 24;
  const step = span / n;
  const out = [];
  let prev = entry;
  for (let i = 0; i <= n; i++) {
    const t = t0 + step * i;
    const base = entry + (exit - entry) * (i / n);
    const wiggle = Math.sin(i * 1.7) * Math.abs(exit - entry || entry * 0.01) * 0.18;
    const close = base + wiggle;
    const open = prev;
    out.push({
      time: Math.floor(t / 1000),
      open, close,
      high: Math.max(open, close) * 1.001,
      low: Math.min(open, close) * 0.999,
    });
    prev = close;
  }
  return out;
}

export default function TradeChartMarker({ trade, height = 280 }) {
  const ref = useRef(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    if (!ref.current || !trade) return;
    const tv = trade.tvChart || {};
    const entry = Number(tv.entryPrice ?? trade.avgEntryPrice) || 0;
    const exit = Number(tv.exitPrice ?? trade.avgExitPrice) || 0;
    const t0 = new Date(tv.entryTime ?? trade.openTime ?? Date.now()).getTime();
    const t1 = new Date(tv.exitTime ?? trade.closeTime ?? Date.now()).getTime();
    const isLong = trade.direction?.toLowerCase() === "long";

    const light = document.documentElement.getAttribute("data-theme") === "light";
    const chart = createChart(ref.current, {
      height,
      layout: { background: { color: "transparent" }, textColor: light ? "#474d57" : "#aeb4bc" },
      grid: { vertLines: { color: "rgba(128,128,128,0.08)" }, horzLines: { color: "rgba(128,128,128,0.08)" } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true },
      handleScroll: false, handleScale: false,
      crosshair: { mode: 0 },
    });
    const series = chart.addCandlestickSeries({
      upColor: "#2ebd85", downColor: "#f6465d", borderVisible: false,
      wickUpColor: "#2ebd85", wickDownColor: "#f6465d",
    });

    let disposed = false;
    (async () => {
      const interval = tvToBinanceInterval(tv.timeframe || trade.timeframe);
      const pad = (TF_MS[tv.timeframe] || 36e5) * 30;
      let data = await fetchKlines(trade.symbol, interval, t0 - pad, t1 + pad);
      if (disposed) return;
      if (!data || data.length < 3) {
        data = synthSeries(entry, exit, t0 - pad, t1 + pad);
        setStatus("synthetic");
      } else {
        setStatus("live");
      }
      series.setData(data);

      // price lines for SL / TP
      const sl = Number(tv.stopPrice) || 0;
      const tp = Number(tv.takeProfit) || 0;
      if (entry) series.createPriceLine({ price: entry, color: isLong ? "#2ebd85" : "#f6465d", lineWidth: 2, lineStyle: 0, title: "Entry" });
      if (exit) series.createPriceLine({ price: exit, color: "#aeb4bc", lineWidth: 2, lineStyle: 2, title: "Exit" });
      if (sl) series.createPriceLine({ price: sl, color: "rgba(246,70,93,0.6)", lineWidth: 1, lineStyle: 1, title: "SL" });
      if (tp) series.createPriceLine({ price: tp, color: "rgba(46,189,133,0.6)", lineWidth: 1, lineStyle: 1, title: "TP" });

      // entry/exit markers
      const markers = [];
      if (entry) markers.push({ time: Math.floor(t0 / 1000), position: isLong ? "belowBar" : "aboveBar", color: isLong ? "#2ebd85" : "#f6465d", shape: isLong ? "arrowUp" : "arrowDown", text: `Entry ${entry}` });
      if (exit) markers.push({ time: Math.floor(t1 / 1000), position: isLong ? "aboveBar" : "belowBar", color: "#fcd535", shape: "circle", text: `Exit ${exit}` });
      series.setMarkers(markers.sort((a, b) => a.time - b.time));

      chart.timeScale().fitContent();
    })();

    const onResize = () => chart.applyOptions({ width: ref.current?.clientWidth || 600 });
    onResize();
    window.addEventListener("resize", onResize);
    return () => { disposed = true; window.removeEventListener("resize", onResize); chart.remove(); };
  }, [trade, height]);

  return (
    <div>
      <div ref={ref} style={{ width: "100%" }} />
      <div style={{ font: "var(--text-caption)", color: "var(--color-text-muted)", marginTop: 6, display: "flex", justifyContent: "space-between" }}>
        <span>Marked from TradingView</span>
        <span>{status === "live" ? "● Live candles" : status === "synthetic" ? "○ Approx. path (no live feed)" : "Loading…"}</span>
      </div>
    </div>
  );
}
