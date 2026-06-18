"use client";

/* ChartAnnotator — inline, reusable interactive chart for marking a trade's
   entry & exit. Used inside LogTradeModal's "Log on chart" section.

   • Symbol comes from the parent form; if it doesn't resolve to a live feed
     the user can search TradingView and pick a different symbol.
   • Crypto pairs (Binance) get a fully interactive candlestick chart: click
     once for entry, again for exit. Markers + price lines draw live.
   • Any other instrument shows the read-only TradingView embed for reference;
     entry/exit are typed in and still drive everything downstream.
   • Reports {symbol, timeframe, entryPrice, exitPrice, entryTime, exitTime}
     to the parent via onChange so the form fields + saved tvChart stay in
     sync, and the trade-details page can redraw the marked chart. */

import { useEffect, useMemo, useRef, useState } from "react";
import { createChart } from "lightweight-charts";
import { MousePointerClick, RotateCcw, Search, X } from "lucide-react";
import { toBinanceSymbol } from "@/utils/livePrice";
import { toTvSymbol } from "@/utils/tvSymbol";
import TvChart from "./TvChart";

const TIMEFRAMES = [
  { id: "1m", label: "1m" },
  { id: "5m", label: "5m" },
  { id: "15m", label: "15m" },
  { id: "1h", label: "1h" },
  { id: "4h", label: "4h" },
  { id: "1d", label: "1D" },
];
const round = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return v;
  const a = Math.abs(v);
  const d = a >= 100 ? 2 : a >= 1 ? 4 : 6;
  return Math.round(v * 10 ** d) / 10 ** d;
};
const fmt = (v) => Number(v).toLocaleString(undefined, { maximumFractionDigits: 6 });

async function loadKlines(symbol, interval = "1h") {
  const b = toBinanceSymbol(symbol);
  if (!b) return null;
  try {
    const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${b}&interval=${interval}&limit=300`);
    if (!res.ok) return null;
    const rows = await res.json();
    return rows.map((r) => ({ time: Math.floor(r[0] / 1000), open: +r[1], high: +r[2], low: +r[3], close: +r[4] }));
  } catch {
    return null;
  }
}

/* TradingView's public symbol search — graceful fallback to free text */
async function searchTv(text) {
  const q = (text || "").trim();
  if (!q) return [];
  try {
    const res = await fetch(
      `https://symbol-search.tradingview.com/symbol_search/?text=${encodeURIComponent(q)}&hl=0&lang=en&domain=production`,
    );
    if (!res.ok) return [];
    const rows = await res.json();
    return (Array.isArray(rows) ? rows : []).slice(0, 12).map((r) => ({
      symbol: (r.symbol || "").replace(/<\/?[^>]+>/g, ""),
      full: `${r.exchange ? `${r.exchange}:` : ""}${(r.symbol || "").replace(/<\/?[^>]+>/g, "")}`,
      desc: (r.description || "").replace(/<\/?[^>]+>/g, ""),
      exchange: r.exchange || "",
      type: r.type || "",
    }));
  } catch {
    return [];
  }
}

export default function ChartAnnotator({
  symbol: symbolProp,
  direction = "long",
  initialEntry = "",
  initialExit = "",
  onChange,
}) {
  const wrapRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const priceLinesRef = useRef([]);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [symbol, setSymbol] = useState((symbolProp || "").toUpperCase());
  const [tf, setTf] = useState("1h");
  const [candles, setCandles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState("entry"); // entry | exit | done
  const [entry, setEntry] = useState(initialEntry ? { price: Number(initialEntry), time: null } : null);
  const [exit, setExit] = useState(initialExit ? { price: Number(initialExit), time: null } : null);

  /* symbol search */
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const hasLiveFeed = !!toBinanceSymbol(symbol);

  /* follow the parent's symbol while the user hasn't searched a new one */
  useEffect(() => {
    if (symbolProp && !searchOpen) setSymbol((symbolProp || "").toUpperCase());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolProp]);

  /* debounced symbol search */
  useEffect(() => {
    if (!searchOpen) return;
    const q = query.trim();
    if (!q) { setResults([]); return; }
    setSearching(true);
    const id = setTimeout(async () => {
      const r = await searchTv(q);
      setResults(r);
      setSearching(false);
    }, 280);
    return () => clearTimeout(id);
  }, [query, searchOpen]);

  /* (re)load candles when symbol or timeframe changes */
  useEffect(() => {
    if (!hasLiveFeed) { setCandles([]); return; }
    let alive = true;
    setLoading(true);
    loadKlines(symbol, tf).then((d) => {
      if (!alive) return;
      setCandles(d || []);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [symbol, tf, hasLiveFeed]);

  /* build the interactive chart + click handler */
  useEffect(() => {
    if (!wrapRef.current || !candles.length) return;
    const light = document.documentElement.getAttribute("data-theme") === "light";
    const chart = createChart(wrapRef.current, {
      height: 340,
      layout: { background: { color: "transparent" }, textColor: light ? "#474d57" : "#aeb4bc" },
      grid: { vertLines: { color: "rgba(128,128,128,0.08)" }, horzLines: { color: "rgba(128,128,128,0.08)" } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true },
      crosshair: { mode: 1 },
    });
    const series = chart.addCandlestickSeries({
      upColor: "#2ebd85", downColor: "#f6465d", borderVisible: false, wickUpColor: "#2ebd85", wickDownColor: "#f6465d",
    });
    series.setData(candles);
    chart.timeScale().fitContent();
    chartRef.current = chart;
    seriesRef.current = series;

    const onClick = (param) => {
      if (!param.point || !param.time) return;
      const price = series.coordinateToPrice(param.point.y);
      if (price == null) return;
      const point = { time: param.time, price: round(price) };
      setPhase((p) => {
        if (p === "entry") { setEntry(point); return "exit"; }
        if (p === "exit") { setExit(point); return "done"; }
        return p;
      });
    };
    chart.subscribeClick(onClick);

    const onResize = () => chart.applyOptions({ width: wrapRef.current?.clientWidth || 600 });
    onResize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [candles]);

  /* redraw markers + price lines */
  useEffect(() => {
    const s = seriesRef.current;
    if (!s) return;
    const markers = [];
    if (entry?.time) markers.push({ time: entry.time, position: direction === "long" ? "belowBar" : "aboveBar", color: direction === "long" ? "#2ebd85" : "#f6465d", shape: direction === "long" ? "arrowUp" : "arrowDown", text: "Entry" });
    if (exit?.time) markers.push({ time: exit.time, position: direction === "long" ? "aboveBar" : "belowBar", color: "#fcd535", shape: "circle", text: "Exit" });
    s.setMarkers(markers.sort((a, b) => a.time - b.time));

    priceLinesRef.current.forEach((l) => { try { s.removePriceLine(l); } catch {} });
    priceLinesRef.current = [];
    if (entry?.price) priceLinesRef.current.push(s.createPriceLine({ price: Number(entry.price), color: direction === "long" ? "#2ebd85" : "#f6465d", lineWidth: 2, lineStyle: 0, title: "Entry" }));
    if (exit?.price) priceLinesRef.current.push(s.createPriceLine({ price: Number(exit.price), color: "#fcd535", lineWidth: 2, lineStyle: 2, title: "Exit" }));
  }, [entry, exit, direction, candles]);

  /* report up to the parent whenever the marks change */
  useEffect(() => {
    onChangeRef.current?.({
      symbol,
      timeframe: tf,
      entryPrice: entry?.price ?? "",
      exitPrice: exit?.price ?? "",
      entryTime: entry?.time ? new Date(entry.time * 1000).toISOString() : null,
      exitTime: exit?.time ? new Date(exit.time * 1000).toISOString() : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, tf, entry?.price, exit?.price, entry?.time, exit?.time]);

  const reset = () => { setEntry(null); setExit(null); setPhase("entry"); };

  const pickSearch = (full, sym) => {
    setSymbol((sym || full || "").toUpperCase());
    setSearchOpen(false);
    setQuery("");
    setResults([]);
    reset();
  };

  const phaseHint = !hasLiveFeed
    ? "No live candles for this symbol — type entry & exit below, or search a crypto pair to click directly"
    : phase === "entry" ? "Click the chart to place your ENTRY"
    : phase === "exit" ? "Now click to place your EXIT"
    : "Entry & exit set — adjust or reset below";

  const tvSymbol = useMemo(() => toTvSymbol(symbol), [symbol]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {/* symbol bar */}
      <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
        <span
          style={{
            display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px",
            borderRadius: 999, background: "var(--color-primary-subtle)", color: "var(--color-text-primary)",
            font: "var(--text-small)", fontWeight: 700,
          }}
        >
          {symbol || "No symbol"}
          {hasLiveFeed && <span style={{ font: "var(--text-caption)", color: "var(--color-success-strong)", fontWeight: 600 }}>● live</span>}
        </span>
        <button
          type="button"
          className="jx-btn jx-btn--secondary jx-btn--sm"
          onClick={() => setSearchOpen((v) => !v)}
        >
          <Search size={14} /> Search TradingView
        </button>
        {hasLiveFeed && (
          <div className="jx-seg jx-seg--inline" style={{ flexWrap: "wrap", marginLeft: "auto" }}>
            {TIMEFRAMES.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`jx-seg__btn ${tf === f.id ? "jx-seg__btn--active" : ""}`}
                style={{ padding: "5px 9px", font: "var(--text-caption)", fontWeight: 600 }}
                onClick={() => setTf(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* search dropdown */}
      {searchOpen && (
        <div className="jx-card jx-card--flat" style={{ padding: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <div className="jx-input" style={{ height: 40 }}>
            <span className="jx-input__icon"><Search size={15} /></span>
            <input
              autoFocus
              placeholder="Search any symbol — AAPL, EURUSD, XAUUSD, BTCUSDT…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && query.trim()) pickSearch(query.trim().toUpperCase(), query.trim().toUpperCase()); }}
            />
            <button type="button" aria-label="Close search" className="jx-input__addon" style={{ cursor: "pointer", border: "none", background: "none" }} onClick={() => setSearchOpen(false)}>
              <X size={15} />
            </button>
          </div>
          {searching && <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>Searching…</span>}
          {!searching && results.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 220, overflowY: "auto" }}>
              {results.map((r) => (
                <button
                  key={r.full + r.desc}
                  type="button"
                  className="jx-dd__option"
                  style={{ display: "flex", alignItems: "center", gap: 8, textAlign: "left" }}
                  onClick={() => pickSearch(r.full, r.symbol)}
                >
                  <span style={{ fontWeight: 700 }}>{r.symbol}</span>
                  <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.desc}</span>
                  <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>{r.exchange}{r.type ? ` · ${r.type}` : ""}</span>
                </button>
              ))}
            </div>
          )}
          {!searching && query.trim() && results.length === 0 && (
            <button type="button" className="jx-dd__option" onClick={() => pickSearch(query.trim().toUpperCase(), query.trim().toUpperCase())}>
              Use “<strong>{query.trim().toUpperCase()}</strong>”
            </button>
          )}
        </div>
      )}

      {/* hint */}
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
        <MousePointerClick size={13} /> {phaseHint}
      </span>

      {/* chart area */}
      {hasLiveFeed ? (
        <div className="jx-card jx-card--flat" style={{ padding: 8, position: "relative", minHeight: 340 }}>
          {loading && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)", font: "var(--text-small)" }}>
              Loading candles…
            </div>
          )}
          <div ref={wrapRef} style={{ width: "100%" }} />
        </div>
      ) : (
        <div className="jx-card jx-card--flat" style={{ padding: 8 }}>
          <TvChart symbol={tvSymbol} height={320} />
        </div>
      )}

      {/* entry/exit — typed or click-filled */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
        <div className="jx-field" style={{ minWidth: 0 }}>
          <label className="jx-field__label" style={{ font: "var(--text-small)", fontWeight: 500 }}>Entry price</label>
          <div className="jx-input" style={{ minWidth: 0 }}>
            <input
              type="number"
              step="any"
              placeholder="0.00"
              value={entry?.price ?? ""}
              onChange={(e) => { const v = e.target.value; setEntry(v === "" ? null : { price: round(v), time: entry?.time ?? null }); }}
            />
          </div>
        </div>
        <div className="jx-field" style={{ minWidth: 0 }}>
          <label className="jx-field__label" style={{ font: "var(--text-small)", fontWeight: 500 }}>Exit price</label>
          <div className="jx-input" style={{ minWidth: 0 }}>
            <input
              type="number"
              step="any"
              placeholder="0.00"
              value={exit?.price ?? ""}
              onChange={(e) => { const v = e.target.value; setExit(v === "" ? null : { price: round(v), time: exit?.time ?? null }); }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap", font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
        <span>Entry: <strong style={{ color: "var(--color-text-primary)" }}>{entry?.price ? fmt(entry.price) : "—"}</strong></span>
        <span>Exit: <strong style={{ color: "var(--color-text-primary)" }}>{exit?.price ? fmt(exit.price) : "—"}</strong></span>
        <button type="button" className="jx-btn jx-btn--ghost jx-btn--sm" onClick={reset} style={{ marginLeft: "auto" }}>
          <RotateCcw size={13} /> Reset points
        </button>
      </div>
    </div>
  );
}
