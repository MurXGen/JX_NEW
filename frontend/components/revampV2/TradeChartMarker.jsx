"use client";

/* Renders a candlestick chart with the trade's entry/exit/SL/TP marked,
   for trades that came from TradingView (no screenshots). Uses
   lightweight-charts; pulls real klines from Binance public API for
   crypto symbols, otherwise draws a synthetic path between entry/exit. */

import { useEffect, useRef, useState } from "react";
import { createChart } from "lightweight-charts";
import { toBinanceSymbol } from "@/utils/livePrice";

const TF_MS = { "1": 60e3, "5": 3e5, "15": 9e5, "60": 36e5, "240": 144e5, "D": 864e5, "1D": 864e5, "1H": 36e5, "4H": 144e5, "15m": 9e5, "5m": 3e5, "1m": 60e3 };
const priceDecimals = (p) => {
  const a = Math.abs(Number(p) || 0);
  if (a === 0) return 2;
  if (a >= 100) return 2;
  if (a >= 1) return 4;
  if (a >= 0.01) return 5;
  if (a >= 0.0001) return 6;
  if (a >= 0.000001) return 8;
  return 10;
};
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

const TF_TABS = [
  { id: "1m", label: "1m" }, { id: "5m", label: "5m" }, { id: "15m", label: "15m" },
  { id: "1h", label: "1h" }, { id: "4h", label: "4h" }, { id: "1d", label: "1D" },
];

export default function TradeChartMarker({ trade, height = 280 }) {
  const ref = useRef(null);
  const [status, setStatus] = useState("loading");
  const [tf, setTf] = useState(null); // null = use the trade's own timeframe

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
    // adaptive precision so small-priced assets (SHIB, forex) keep their
    // decimals instead of collapsing to "0.00"
    const refPrice = entry || exit || 1;
    const prec = priceDecimals(refPrice);
    const series = chart.addCandlestickSeries({
      upColor: "#2ebd85", downColor: "#f6465d", borderVisible: false,
      wickUpColor: "#2ebd85", wickDownColor: "#f6465d",
      priceFormat: { type: "price", precision: prec, minMove: 1 / 10 ** prec },
    });

    let disposed = false;
    (async () => {
      const interval = tf || tvToBinanceInterval(tv.timeframe || trade.timeframe);
      const intervalMs = { "1m": 60e3, "5m": 3e5, "15m": 9e5, "1h": 36e5, "4h": 144e5, "1d": 864e5 }[interval] || 36e5;
      const pad = intervalMs * 40;
      let data = await fetchKlines(trade.symbol, interval, t0 - pad, t1 + pad);
      if (disposed) return;
      if (!data || data.length < 3) {
        // synthSeries needs t0 < t1, otherwise it produces descending times
        const a = Math.min(t0, t1) || Date.now() - 864e5;
        const b = Math.max(t0, t1) || Date.now();
        data = synthSeries(entry, exit, a - pad, b + pad);
        setStatus("synthetic");
      } else {
        setStatus("live");
      }
      // lightweight-charts requires strictly-ascending, de-duplicated times
      const seen = new Set();
      data = (data || [])
        .filter((d) => d && Number.isFinite(d.time))
        .sort((p, q) => p.time - q.time)
        .filter((d) => (seen.has(d.time) ? false : (seen.add(d.time), true)));
      if (!data.length) return;
      series.setData(data);

      // SL / TP stay as faint reference lines
      const sl = Number(tv.stopPrice) || 0;
      const tp = Number(tv.takeProfit) || 0;
      if (sl) series.createPriceLine({ price: sl, color: "rgba(246,70,93,0.6)", lineWidth: 1, lineStyle: 1, title: "SL" });
      if (tp) series.createPriceLine({ price: tp, color: "rgba(46,189,133,0.6)", lineWidth: 1, lineStyle: 1, title: "TP" });

      // Entry/exit shown as ARROWS (no horizontal lines).
      const nearestTimeForPrice = (price) => {
        if (!price) return null;
        let bestT = data[0]?.time, bestD = Infinity;
        for (const c of data) {
          const d = Math.min(Math.abs(c.close - price), Math.abs(c.high - price), Math.abs(c.low - price));
          if (d < bestD) { bestD = d; bestT = c.time; }
        }
        return bestT;
      };
      const nearestTimeForTs = (ts) => {
        let bestT = data[0]?.time, bestD = Infinity;
        for (const c of data) {
          const d = Math.abs(c.time - ts);
          if (d < bestD) { bestD = d; bestT = c.time; }
        }
        return bestT;
      };

      // Prefer the REAL trade timestamps so the arrows land in the correct
      // chronological order (entry before exit). Only when we have no distinct
      // times (e.g. a quick log where open == close) do we fall back to
      // placing each arrow on the candle nearest its price.
      const hasDistinctTimes =
        Number.isFinite(t0) && Number.isFinite(t1) && Math.abs(t1 - t0) >= intervalMs;
      let entryT, exitT;
      if (hasDistinctTimes) {
        entryT = entry ? nearestTimeForTs(Math.floor(t0 / 1000)) : null;
        exitT = exit ? nearestTimeForTs(Math.floor(t1 / 1000)) : null;
      } else {
        entryT = nearestTimeForPrice(entry);
        exitT = nearestTimeForPrice(exit);
      }
      // if both map to the same candle, nudge the exit to a neighbour so both arrows show
      if (entry && exit && exitT === entryT && entryT != null) {
        const idx = data.findIndex((c) => c.time === entryT);
        const nb = data[idx + 1] || data[idx - 1];
        if (nb) exitT = nb.time;
      }

      const markers = [];
      // entry arrow points in the trade's direction (long = up, short = down)
      if (entry && entryT != null)
        markers.push({ time: entryT, position: isLong ? "belowBar" : "aboveBar", color: isLong ? "#2ebd85" : "#f6465d", shape: isLong ? "arrowUp" : "arrowDown", text: "Entry" });
      // exit arrow points the opposite way (closing the position)
      if (exit && exitT != null)
        markers.push({ time: exitT, position: isLong ? "aboveBar" : "belowBar", color: "#fcd535", shape: isLong ? "arrowDown" : "arrowUp", text: "Exit" });
      series.setMarkers(markers.sort((a, b) => a.time - b.time));

      chart.timeScale().fitContent();
    })();

    const onResize = () => chart.applyOptions({ width: ref.current?.clientWidth || 600 });
    onResize();
    window.addEventListener("resize", onResize);
    return () => { disposed = true; window.removeEventListener("resize", onResize); chart.remove(); };
  }, [trade, height, tf]);

  const activeTf = tf || tvToBinanceInterval((trade?.tvChart || {}).timeframe || trade?.timeframe);

  return (
    <div>
      {/* timeframe tabs */}
      <div className="jx-seg jx-seg--inline" style={{ flexWrap: "wrap", marginBottom: 8 }}>
        {TF_TABS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`jx-seg__btn ${activeTf === f.id ? "jx-seg__btn--active" : ""}`}
            style={{ padding: "5px 10px", font: "var(--text-caption)", fontWeight: 600 }}
            onClick={() => setTf(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div ref={ref} style={{ width: "100%" }} />
      <div style={{ font: "var(--text-caption)", color: "var(--color-text-muted)", marginTop: 6, display: "flex", justifyContent: "space-between" }}>
        <span>Entry &amp; exit marked</span>
        <span>{status === "live" ? "● Live candles" : status === "synthetic" ? "○ Approx. path (no live feed)" : "Loading…"}</span>
      </div>
    </div>
  );
}
