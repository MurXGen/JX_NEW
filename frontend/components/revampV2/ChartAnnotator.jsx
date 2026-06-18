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
import { MousePointerClick, Pencil, RotateCcw, Search, X } from "lucide-react";
import { toBinanceSymbol } from "@/utils/livePrice";
import { toTvSymbol } from "@/utils/tvSymbol";
import Dropdown from "./Dropdown";
import QuickFillChips from "./QuickFillChips";
import TvChart from "./TvChart";

/* Curated fallback so common symbols autocomplete even when TradingView's
   search endpoint is unreachable (CORS) — stocks, indices, forex, crypto. */
const CURATED = [
  ["AAPL", "Apple Inc", "NASDAQ"], ["TSLA", "Tesla Inc", "NASDAQ"], ["MSFT", "Microsoft", "NASDAQ"],
  ["AMZN", "Amazon", "NASDAQ"], ["GOOGL", "Alphabet", "NASDAQ"], ["NVDA", "NVIDIA", "NASDAQ"],
  ["META", "Meta Platforms", "NASDAQ"], ["NFLX", "Netflix", "NASDAQ"], ["AMD", "AMD", "NASDAQ"],
  ["SPY", "S&P 500 ETF", "AMEX"], ["QQQ", "Nasdaq 100 ETF", "NASDAQ"],
  ["NIFTY", "Nifty 50", "NSE"], ["BANKNIFTY", "Bank Nifty", "NSE"], ["RELIANCE", "Reliance", "NSE"],
  ["TCS", "Tata Consultancy", "NSE"], ["INFY", "Infosys", "NSE"], ["HDFCBANK", "HDFC Bank", "NSE"],
  ["SPX", "S&P 500 Index", "TVC"], ["NDX", "Nasdaq 100", "NASDAQ"], ["DJI", "Dow Jones", "TVC"],
  ["EURUSD", "Euro / US Dollar", "FX"], ["GBPUSD", "Pound / Dollar", "FX"], ["USDJPY", "Dollar / Yen", "FX"],
  ["USDINR", "Dollar / Rupee", "FX"], ["AUDUSD", "Aussie / Dollar", "FX"],
  ["XAUUSD", "Gold", "OANDA"], ["XAGUSD", "Silver", "OANDA"], ["USOIL", "Crude Oil (WTI)", "TVC"],
  ["BTCUSDT", "Bitcoin", "BINANCE"], ["ETHUSDT", "Ethereum", "BINANCE"], ["SOLUSDT", "Solana", "BINANCE"],
  ["BNBUSDT", "BNB", "BINANCE"], ["XRPUSDT", "XRP", "BINANCE"], ["DOGEUSDT", "Dogecoin", "BINANCE"],
].map(([symbol, desc, exchange]) => ({ symbol, desc, exchange, full: `${exchange}:${symbol}`, type: "" }));

const curatedMatches = (q) => {
  const s = q.trim().toUpperCase();
  if (!s) return [];
  return CURATED.filter((r) => r.symbol.includes(s) || r.desc.toUpperCase().includes(s)).slice(0, 10);
};

const TIMEFRAMES = [
  { id: "1m", label: "1m" },
  { id: "5m", label: "5m" },
  { id: "15m", label: "15m" },
  { id: "1h", label: "1h" },
  { id: "4h", label: "4h" },
  { id: "1d", label: "1D" },
];
/* decimals to keep for a given price — adaptive so 65,000 stays at 2 dp while
   tiny prices like 0.00002430 (SHIB, some forex) keep their significant
   figures, without padding large prices with useless trailing zeros. */
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
const round = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return v;
  const d = priceDecimals(v);
  return Math.round(v * 10 ** d) / 10 ** d;
};
/* price formatter — adaptive decimals, no trailing-zero padding */
const fmt = (v) => Number(v).toLocaleString(undefined, { maximumFractionDigits: priceDecimals(v) });
/* money/P&L formatter — currency amounts, 2 dp */
const fmtMoney = (v) => Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 });

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
const stripTags = (s) => (s || "").replace(/<\/?[^>]+>/g, "");
async function searchTv(text) {
  const q = (text || "").trim();
  if (!q) return [];
  try {
    const res = await fetch(
      `https://symbol-search.tradingview.com/symbol_search/?text=${encodeURIComponent(q)}&hl=0&lang=en&domain=production`,
    );
    if (!res.ok) return [];
    const json = await res.json();
    // endpoint returns either a bare array or { symbols: [...] }
    const rows = Array.isArray(json) ? json : Array.isArray(json?.symbols) ? json.symbols : [];
    return rows.slice(0, 14).map((r) => {
      const symbol = stripTags(r.symbol);
      return {
        symbol,
        full: `${r.exchange ? `${r.exchange}:` : r.prefix ? `${r.prefix}:` : ""}${symbol}`,
        desc: stripTags(r.description),
        exchange: r.exchange || r.prefix || "",
        type: r.type || "",
      };
    });
  } catch {
    return [];
  }
}

export default function ChartAnnotator({
  symbol: symbolProp,
  direction = "long",
  initialEntry = "",
  initialExit = "",
  initialSize = "",
  initialSizeUnit = "asset",
  sym = "$",
  quoteCode = "USD",
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
  const [size, setSize] = useState(initialSize ? String(initialSize) : "");
  const [sizeUnit, setSizeUnit] = useState(initialSizeUnit || "asset");

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
    // show curated matches instantly, then merge in TradingView results
    setResults(curatedMatches(q));
    setSearching(true);
    const id = setTimeout(async () => {
      const tv = await searchTv(q);
      const cur = curatedMatches(q);
      const seen = new Set();
      const merged = [...tv, ...cur].filter((r) => {
        const k = r.full || r.symbol;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      setResults(merged);
      setSearching(false);
    }, 280);
    return () => clearTimeout(id);
  }, [query, searchOpen]);

  /* (re)load candles when symbol or timeframe changes (crypto only) */
  useEffect(() => {
    if (!hasLiveFeed) { setCandles([]); setLoading(false); return; }
    let alive = true;
    setLoading(true);
    loadKlines(symbol, tf).then((d) => {
      if (!alive) return;
      setCandles(d || []);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [symbol, tf, hasLiveFeed]);

  // crypto with real candles → interactive clickable chart
  const chartReady = hasLiveFeed && !loading && candles.length > 1;
  // any other symbol (or crypto with no Binance data) → read-only TradingView
  // embed + typed entry/exit. "active" = a symbol is loaded and loggable.
  const embedMode = !chartReady && !loading && !!symbol;
  const active = chartReady || embedMode;

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
    // adaptive precision so small-priced assets (SHIB, forex) aren't flattened
    // to "0.00" on the axis / price lines, and big prices keep just 2 dp
    const prec = priceDecimals(candles[candles.length - 1]?.close ?? candles[0]?.close);
    const series = chart.addCandlestickSeries({
      upColor: "#2ebd85", downColor: "#f6465d", borderVisible: false, wickUpColor: "#2ebd85", wickDownColor: "#f6465d",
      priceFormat: { type: "price", precision: prec, minMove: 1 / 10 ** prec },
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

  /* redraw entry/exit as ARROWS (no horizontal lines). Use the clicked candle
     time when available; for typed prices, anchor to the candle nearest that
     price so the arrow lines up with the chart. */
  useEffect(() => {
    const s = seriesRef.current;
    if (!s) return;
    const long = direction === "long";
    const nearestTime = (price) => {
      if (!price || !candles.length) return null;
      let bestT = candles[0]?.time, bestD = Infinity;
      for (const c of candles) {
        const d = Math.min(Math.abs(c.close - price), Math.abs(c.high - price), Math.abs(c.low - price));
        if (d < bestD) { bestD = d; bestT = c.time; }
      }
      return bestT;
    };
    const eT = entry?.price ? (entry.time ?? nearestTime(entry.price)) : null;
    let xT = exit?.price ? (exit.time ?? nearestTime(exit.price)) : null;
    if (eT != null && xT != null && xT === eT) {
      const idx = candles.findIndex((c) => c.time === eT);
      const nb = candles[idx + 1] || candles[idx - 1];
      if (nb) xT = nb.time;
    }
    const markers = [];
    if (eT != null) markers.push({ time: eT, position: long ? "belowBar" : "aboveBar", color: long ? "#2ebd85" : "#f6465d", shape: long ? "arrowUp" : "arrowDown", text: "Entry" });
    if (xT != null) markers.push({ time: xT, position: long ? "aboveBar" : "belowBar", color: "#fcd535", shape: long ? "arrowDown" : "arrowUp", text: "Exit" });
    s.setMarkers(markers.sort((a, b) => a.time - b.time));

    // no entry/exit price lines — arrows only
    priceLinesRef.current.forEach((l) => { try { s.removePriceLine(l); } catch {} });
    priceLinesRef.current = [];
  }, [entry, exit, direction, candles]);

  /* live P&L from the marks + size */
  const calc = useMemo(() => {
    const e = entry?.price, x = exit?.price;
    const sz = Number(size);
    const dir = direction === "long" ? 1 : -1;
    const assetQty = sizeUnit === "asset" ? sz : sz && e ? sz / e : 0;
    const pnl = e && x && assetQty ? (x - e) * assetQty * dir : null;
    const notional = e && assetQty ? e * assetQty : null;
    const retPct = pnl != null && notional ? (pnl / notional) * 100 : null;
    return { assetQty, pnl, retPct };
  }, [entry, exit, size, sizeUnit, direction]);

  /* report everything up to the parent whenever the marks/size/P&L change.
     When there's no usable chart we report blanks so a non-charted symbol
     never saves chart metadata or overwrites the form. */
  useEffect(() => {
    onChangeRef.current?.({
      symbol,
      timeframe: tf,
      entryPrice: active ? (entry?.price ?? "") : "",
      exitPrice: active ? (exit?.price ?? "") : "",
      entryTime: chartReady && entry?.time ? new Date(entry.time * 1000).toISOString() : null,
      exitTime: chartReady && exit?.time ? new Date(exit.time * 1000).toISOString() : null,
      size: active && size !== "" ? Number(size) : "",
      sizeUnit,
      pnl: active ? calc.pnl : null,
      chartReady,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, tf, entry?.price, exit?.price, entry?.time, exit?.time, size, sizeUnit, calc.pnl, active, chartReady]);

  const reset = () => { setEntry(null); setExit(null); setPhase("entry"); };

  const pickSearch = (full, sym) => {
    setSymbol((sym || full || "").toUpperCase());
    setSearchOpen(false);
    setQuery("");
    setResults([]);
    reset();
  };

  const phaseHint = embedMode
    ? "Type your entry & exit below — the chart is read-only for this symbol (clickable marking is available for crypto pairs)"
    : phase === "entry" ? "Click the chart to place your ENTRY"
    : phase === "exit" ? "Now click to place your EXIT"
    : "Entry & exit set — adjust or reset below";

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
          {chartReady && <span style={{ font: "var(--text-caption)", color: "var(--color-success-strong)", fontWeight: 600 }}>● live</span>}
          {embedMode && <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)", fontWeight: 600 }}>TradingView</span>}
        </span>
        <button
          type="button"
          className="jx-btn jx-btn--secondary jx-btn--sm"
          onClick={() => setSearchOpen((v) => !v)}
        >
          <Search size={14} /> Search TradingView
        </button>
        {chartReady && (
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
      {active && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
          {chartReady ? <MousePointerClick size={13} /> : <Pencil size={13} />} {phaseHint}
        </span>
      )}

      {/* chart area */}
      {loading ? (
        <div className="jx-card jx-card--flat" style={{ minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)", font: "var(--text-small)" }}>
          Loading chart…
        </div>
      ) : chartReady ? (
        <div className="jx-card jx-card--flat" style={{ padding: 8, position: "relative", minHeight: 340 }}>
          <div ref={wrapRef} style={{ width: "100%" }} />
        </div>
      ) : embedMode ? (
        <div className="jx-card jx-card--flat" style={{ padding: 8 }}>
          <TvChart symbol={toTvSymbol(symbol)} height={320} />
        </div>
      ) : (
        <div
          className="jx-card jx-card--flat"
          style={{
            minHeight: 160,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "var(--space-6) var(--space-4)",
            font: "var(--text-small)",
            color: "var(--color-text-muted)",
          }}
        >
          Search and pick a symbol above to load its chart.
        </div>
      )}

      {/* entry/exit + size + P&L — shown whenever a symbol is loaded */}
      {active && (
        <>
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

          {/* position size — needed to turn the marks into a P&L */}
          <div className="jx-field" style={{ minWidth: 0 }}>
            <label className="jx-field__label" style={{ font: "var(--text-small)", fontWeight: 500 }}>Position size</label>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <div className="jx-input" style={{ flex: 1, minWidth: 0 }}>
                <input
                  type="number"
                  step="any"
                  placeholder={sizeUnit === "usd" ? `${sym}5,000` : "0.5"}
              aria-label="Position size"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                />
              </div>
              <div style={{ width: 110, flexShrink: 0 }}>
                <Dropdown
                  value={sizeUnit}
                  onChange={setSizeUnit}
                  options={[
                    { value: "asset", label: symbol ? symbol.split("/")[0].slice(0, 6) : "Asset" },
                    { value: "usd", label: quoteCode },
                  ]}
                />
              </div>
            </div>
            <div style={{ marginTop: "var(--space-2)" }}>
              <QuickFillChips
                value={size}
                onPick={(v) => setSize(v)}
                defaults={sizeUnit === "usd" ? ["100", "500", "1000", "5000"] : ["0.25", "0.5", "1", "2", "5"]}
                storageKey={sizeUnit === "usd" ? `jx-size-cash-chips-${quoteCode}` : "jx-size-asset-chips"}
                prefix={sizeUnit === "usd" ? sym : ""}
              />
            </div>
          </div>

          {/* live P&L from the chart marks */}
          {calc.pnl != null && (
            <div
              className={`jx-banner ${calc.pnl >= 0 ? "jx-banner--success" : ""}`}
              style={calc.pnl < 0 ? { background: "var(--color-danger-subtle)" } : undefined}
            >
              <MousePointerClick size={15} style={{ color: calc.pnl >= 0 ? "var(--color-success)" : "var(--color-danger)" }} />
              <span>
                Net P&amp;L from chart{" "}
                <strong style={{ color: calc.pnl >= 0 ? "var(--color-success-strong)" : "var(--color-danger-strong)" }}>
                  {calc.pnl < 0 ? "−" : "+"}{sym}{fmtMoney(Math.abs(calc.pnl))}
                </strong>
                {calc.retPct != null && <> · {calc.retPct >= 0 ? "+" : ""}{fmt(Math.round(calc.retPct * 10) / 10)}%</>}
              </span>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap", font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
            <span>Entry: <strong style={{ color: "var(--color-text-primary)" }}>{entry?.price ? fmt(entry.price) : "—"}</strong></span>
            <span>Exit: <strong style={{ color: "var(--color-text-primary)" }}>{exit?.price ? fmt(exit.price) : "—"}</strong></span>
            <button type="button" className="jx-btn jx-btn--ghost jx-btn--sm" onClick={reset} style={{ marginLeft: "auto" }}>
              <RotateCcw size={13} /> Reset points
            </button>
          </div>
        </>
      )}
    </div>
  );
}
