"use client";

/* ChartTradeModal — log a trade by marking it on a live chart.
   Click the chart to drop the Entry, click again for the Exit; set
   direction/size/stop in the side panel; live P&L; Save posts to the
   normal trade API tied to the logged-in account (source=tradingview)
   so the details page redraws the marked chart. */

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import Cookies from "js-cookie";
import { createChart } from "lightweight-charts";
import { Check, MousePointerClick, RotateCcw, Search, TrendingDown, TrendingUp, X } from "lucide-react";
import Badge from "./Badge";
import Button from "./Button";
import Dropdown from "./Dropdown";
import Toast from "./Toast";
import { toBinanceSymbol } from "@/utils/livePrice";
import { getFromIndexedDB, saveToIndexedDB } from "@/utils/indexedDB";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const fmt = (v, d = 2) => Number(v).toLocaleString(undefined, { maximumFractionDigits: d });
/* compact money: 12.12k / 1.20M, max 2 decimals */
const cmoney = (v) => {
  const a = Math.abs(Number(v) || 0);
  const sign = v < 0 ? "−" : "+";
  if (a >= 1e6) return `${sign}$${fmt(a / 1e6, 2)}M`;
  if (a >= 1e3) return `${sign}$${fmt(a / 1e3, 2)}k`;
  return `${sign}$${fmt(a, 2)}`;
};
const POPULAR = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT"];

const TIMEFRAMES = [
  { id: "1m", label: "1m" },
  { id: "5m", label: "5m" },
  { id: "15m", label: "15m" },
  { id: "1h", label: "1h" },
  { id: "4h", label: "4h" },
  { id: "1d", label: "1D" },
];
const round2 = (n) => Math.round(Number(n) * 100) / 100;

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

function Spinner() {
  return (
    <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
      style={{ width: 14, height: 14, borderRadius: "50%", display: "inline-block", border: "2px solid color-mix(in srgb, currentColor 30%, transparent)", borderTopColor: "currentColor" }} />
  );
}

export default function ChartTradeModal({ open, onClose, onSaved, annotateMode = false, initialTrade = null, onAnnotated }) {
  const wrapRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const priceLinesRef = useRef([]);
  const [symbols, setSymbols] = useState(POPULAR);
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [accounts, setAccounts] = useState([]);
  const [journalId, setJournalId] = useState("");
  const [tf, setTf] = useState("1h");
  const [candles, setCandles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState("entry"); // entry | exit | done
  const [entry, setEntry] = useState(null); // {time, price}
  const [exit, setExit] = useState(null);
  const [direction, setDirection] = useState("long");
  const [sizeUnit, setSizeUnit] = useState("asset");
  const [size, setSize] = useState("");
  const [stop, setStop] = useState("");
  const [tp, setTp] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const flash = (type, msg, ms = 3000) => { setToast({ type, msg }); setTimeout(() => setToast(null), ms); };

  /* symbols from the user's own trades + popular */
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const u = await getFromIndexedDB("user-data");
        const seen = [...new Set((u?.trades || []).map((t) => toBinanceSymbol(t.symbol)).filter(Boolean))];
        setSymbols([...new Set([...seen, ...POPULAR])]);
        const accs = u?.accounts || [];
        setAccounts(accs);
        const cookieId = Cookies.get("accountId");
        setJournalId(cookieId || accs[0]?._id || "");
      } catch {}
    })();
    reset();
  }, [open]);

  const reset = () => {
    setPhase("entry"); setEntry(null); setExit(null);
    setSize(""); setStop(""); setTp(""); setNotes("");
  };

  /* annotate mode → prefill from the existing trade */
  useEffect(() => {
    if (!open || !annotateMode || !initialTrade) return;
    const t = initialTrade;
    const e = Number(t.avgEntryPrice ?? t.entries?.[0]?.price) || 0;
    const x = Number(t.avgExitPrice ?? t.exits?.[0]?.price) || 0;
    setSymbol(toBinanceSymbol(t.symbol) || (t.symbol || "").toUpperCase() || "BTCUSDT");
    setDirection((t.direction || "long").toLowerCase());
    setSizeUnit("asset");
    setSize(t.totalQuantity ? String(t.totalQuantity) : "");
    setStop(t.avgSLPrice ? String(t.avgSLPrice) : "");
    setTp(t.avgTPPrice ? String(t.avgTPPrice) : "");
    setNotes(t.learnings || "");
    if (e) setEntry({ price: e, time: null });
    if (x) setExit({ price: x, time: null });
    setPhase(e && x ? "done" : e ? "exit" : "entry");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, annotateMode, initialTrade?._id]);

  /* (re)load candles when symbol or timeframe changes */
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    loadKlines(symbol, tf).then((d) => {
      setCandles(d || []);
      setLoading(false);
    });
    // in annotate mode entry/exit are prices that hold across timeframe views
    if (!annotateMode) { setEntry(null); setExit(null); setPhase("entry"); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, tf, open]);

  /* build the chart + click handler */
  useEffect(() => {
    if (!open || !wrapRef.current || !candles.length) return;
    const light = document.documentElement.getAttribute("data-theme") === "light";
    const chart = createChart(wrapRef.current, {
      height: 380,
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
      const point = { time: param.time, price: round2(price) };
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
    return () => { window.removeEventListener("resize", onResize); chart.remove(); chartRef.current = null; seriesRef.current = null; };
  }, [candles, open]);

  /* redraw markers + horizontal price lines when entry/exit/stop/tp change */
  useEffect(() => {
    const s = seriesRef.current;
    if (!s) return;
    // bar markers (only when we have a click-time)
    const markers = [];
    if (entry?.time) markers.push({ time: entry.time, position: direction === "long" ? "belowBar" : "aboveBar", color: direction === "long" ? "#2ebd85" : "#f6465d", shape: direction === "long" ? "arrowUp" : "arrowDown", text: "Entry" });
    if (exit?.time) markers.push({ time: exit.time, position: direction === "long" ? "aboveBar" : "belowBar", color: "#fcd535", shape: "circle", text: "Exit" });
    s.setMarkers(markers.sort((a, b) => a.time - b.time));

    // horizontal price lines — show entry/exit/stop/tp even before a click
    priceLinesRef.current.forEach((l) => { try { s.removePriceLine(l); } catch {} });
    priceLinesRef.current = [];
    const add = (price, color, style, title) => {
      if (!price) return;
      priceLinesRef.current.push(s.createPriceLine({ price: Number(price), color, lineWidth: 2, lineStyle: style, title }));
    };
    if (entry?.price) add(entry.price, direction === "long" ? "#2ebd85" : "#f6465d", 0, "Entry");
    if (exit?.price) add(exit.price, "#fcd535", 2, "Exit");
    if (Number(stop)) add(Number(stop), "rgba(246,70,93,0.7)", 1, "SL");
    if (Number(tp)) add(Number(tp), "rgba(46,189,133,0.7)", 1, "TP");
  }, [entry, exit, direction, stop, tp, candles]);

  /* live calc */
  const calc = useMemo(() => {
    const e = entry?.price, x = exit?.price;
    const lev = 1;
    const assetQty = sizeUnit === "asset" ? Number(size) : (Number(size) && e ? Number(size) / e : 0);
    const dir = direction === "long" ? 1 : -1;
    const pnl = e && x && assetQty ? (x - e) * assetQty * dir : null;
    const notional = e && assetQty ? e * assetQty : null;
    const retPct = pnl != null && notional ? (pnl / notional) * 100 : null;
    const s = Number(stop), t = Number(tp);
    const rr = e && s && t && Math.abs(e - s) > 0 ? Math.abs(t - e) / Math.abs(e - s) : null;
    return { assetQty, pnl, retPct, rr, notional };
  }, [entry, exit, size, sizeUnit, direction, stop, tp]);

  /* annotate an existing trade — only updates entry/exit/pnl + chart, not sizing logic */
  const saveAnnotation = async () => {
    if (!entry?.price) return flash("danger", "Set your entry price");
    if (!exit?.price) return flash("danger", "Set your exit price");
    setSaving(true);
    try {
      const res = await axios.post(
        `${API_BASE}/api/trades/${initialTrade._id}/annotate`,
        {
          entryPrice: entry.price,
          exitPrice: exit.price,
          timeframe: tf,
          symbol,
          direction,
          totalQuantity: Number(size) || initialTrade.totalQuantity || 0,
          pnl: calc.pnl ?? undefined,
          stopPrice: Number(stop) || 0,
          takeProfit: Number(tp) || 0,
        },
        { withCredentials: true },
      );
      const updated = res.data?.trade;
      try {
        const u = (await getFromIndexedDB("user-data")) || {};
        u.trades = (u.trades || []).map((x) => (x._id === updated?._id ? { ...x, ...updated } : x));
        await saveToIndexedDB("user-data", u);
      } catch {}
      onAnnotated?.(updated);
      flash("success", "Chart saved");
      setTimeout(() => onClose?.(), 800);
    } catch (err) {
      if (err?.response?.data?.limit) {
        flash("danger", "Free plan: 5 chart logs / month reached — upgrade for unlimited");
      } else {
        flash("danger", err.response?.data?.message || "Could not save — try again");
      }
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    if (annotateMode) return saveAnnotation();
    if (!entry) return flash("danger", "Click the chart to place your entry");
    if (!exit) return flash("danger", "Click again to place your exit");
    if (!Number(size)) return flash("danger", "Enter your position size");
    const accountId = journalId || Cookies.get("accountId");
    if (!accountId) return flash("danger", "Select a journal first");

    const openTime = new Date(entry.time * 1000).toISOString();
    const closeTime = new Date(exit.time * 1000).toISOString();
    const fd = new FormData();
    fd.append("accountId", accountId);
    fd.append("symbol", symbol);
    fd.append("direction", direction);
    fd.append("tradeStatus", "closed");
    fd.append("source", "tradingview");
    fd.append("sizeUnit", sizeUnit);
    fd.append("quantityUSD", calc.notional || 0);
    fd.append("totalQuantity", calc.assetQty || 0);
    fd.append("leverage", 1);
    fd.append("entries", JSON.stringify([{ price: entry.price, allocation: 100, quantity: calc.assetQty || 0 }]));
    fd.append("exits", JSON.stringify([{ mode: "price", price: exit.price, allocation: 100, quantity: calc.assetQty || 0 }]));
    fd.append("sls", JSON.stringify(Number(stop) ? [{ mode: "price", price: Number(stop), allocation: 100 }] : []));
    fd.append("tps", JSON.stringify(Number(tp) ? [{ mode: "price", price: Number(tp), allocation: 100 }] : []));
    fd.append("avgEntryPrice", entry.price);
    fd.append("avgExitPrice", exit.price);
    fd.append("avgSLPrice", Number(stop) || 0);
    fd.append("avgTPPrice", Number(tp) || 0);
    fd.append("rr", calc.rr ? `1:${fmt(calc.rr, 1)}` : "");
    fd.append("pnl", calc.pnl || 0);
    fd.append("pnlAfterFee", calc.pnl || 0);
    fd.append("openTime", openTime);
    fd.append("closeTime", closeTime);
    fd.append("duration", Math.max(0, (new Date(closeTime) - new Date(openTime)) / 36e5));
    fd.append("learnings", notes);
    /* tvChart metadata so the details page can redraw it */
    fd.append("tvChart", JSON.stringify({
      symbol, exchange: "BINANCE", timeframe: "60",
      entryTime: openTime, exitTime: closeTime,
      entryPrice: entry.price, exitPrice: exit.price,
      stopPrice: Number(stop) || 0, takeProfit: Number(tp) || 0,
    }));

    setSaving(true);
    try {
      const res = await axios.post(`${API_BASE}/api/trades/addd`, fd, { withCredentials: true });
      const trade = res.data?.trade;
      try {
        const u = (await getFromIndexedDB("user-data")) || {};
        u.trades = [...(u.trades || []), trade];
        await saveToIndexedDB("user-data", u);
      } catch {}
      onSaved?.(trade);
      flash("success", "Trade logged from chart");
      setTimeout(() => onClose?.(), 900);
    } catch (err) {
      console.error(err);
      flash("danger", err.response?.data?.message || "Could not save — try again");
    } finally {
      setSaving(false);
    }
  };

  const phaseHint = annotateMode
    ? "Type exact prices or click the chart to set entry & exit"
    : phase === "entry" ? "Click the chart to place your ENTRY"
    : phase === "exit" ? "Now click to place your EXIT"
    : "Entry & exit set — adjust details and save";
  const canSave = annotateMode ? !!(entry?.price && exit?.price) : phase === "done";

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="jx-modal-overlay jx-modal-overlay--blur"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
          onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose?.()}>
          <Toast toast={toast} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="jx-ltmodal" style={{ width: "min(1000px, 96vw)" }}>
            <div className="jx-ltmodal__header">
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ font: "var(--text-h2)" }}>{annotateMode ? "Annotate on chart" : "Log a trade on the chart"}</span>
                <span style={{ font: "var(--text-small)", color: "var(--color-text-muted)" }}>{phaseHint}</span>
              </div>
              <button className="jx-btn jx-btn--secondary jx-btn--sm" onClick={onClose} aria-label="Close" style={{ padding: 8 }} disabled={saving}><X size={16} /></button>
            </div>

            <div className="jx-ltmodal__body">
              {/* chart side */}
              <div className="jx-ltmodal__form" style={{ gap: "var(--space-3)" }}>
                <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ width: 200, maxWidth: "100%" }}>
                    <Dropdown value={symbol} onChange={setSymbol} options={symbols} label="Symbol" searchable allowCustom
                      leading={<span className="jx-input__icon"><Search size={15} /></span>} />
                  </div>
                  {/* timeframe tabs */}
                  <div className="jx-seg jx-seg--inline" style={{ flexWrap: "wrap" }}>
                    {TIMEFRAMES.map((f) => (
                      <button key={f.id} type="button" className={`jx-seg__btn ${tf === f.id ? "jx-seg__btn--active" : ""}`} style={{ padding: "6px 10px", font: "var(--text-caption)", fontWeight: 600 }} onClick={() => setTf(f.id)}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <Button variant="ghost" size="sm" icon={RotateCcw} onClick={reset} style={{ marginLeft: "auto" }}>Reset points</Button>
                </div>
                <Badge variant="brand"><MousePointerClick size={12} /> {phaseHint}</Badge>
                <div className="jx-card jx-card--flat" style={{ padding: 8, position: "relative", minHeight: 380 }}>
                  {loading && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)", font: "var(--text-small)" }}>Loading candles…</div>}
                  {!loading && candles.length === 0 && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 20, color: "var(--color-text-muted)", font: "var(--text-small)" }}>
                      No live candles for “{symbol}”. Pick a crypto pair (e.g. BTCUSDT) to mark on a chart, or use the standard Log Trade form for other markets.
                    </div>
                  )}
                  <div ref={wrapRef} style={{ width: "100%" }} />
                </div>
                <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap", font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                  <span>Entry: <strong style={{ color: "var(--color-text-primary)" }}>{entry ? `$${fmt(entry.price)}` : "—"}</strong></span>
                  <span>Exit: <strong style={{ color: "var(--color-text-primary)" }}>{exit ? `$${fmt(exit.price)}` : "—"}</strong></span>
                </div>
              </div>

              {/* controls side */}
              <div className="jx-ltmodal__rail">
                {!annotateMode && (
                  <div className="jx-field">
                    <label className="jx-field__label" style={{ font: "var(--text-small)", fontWeight: 500 }}>Journal</label>
                    <Dropdown
                      value={journalId}
                      onChange={setJournalId}
                      placeholder="Select a journal"
                      options={accounts.map((a) => ({ value: a._id, label: a.name }))}
                    />
                  </div>
                )}

                <div className="jx-field">
                  <label className="jx-field__label" style={{ font: "var(--text-small)", fontWeight: 500 }}>Direction</label>
                  <div className="jx-dirbig">
                    <button type="button" className={`jx-dirbig__btn ${direction === "long" ? "jx-dirbig__btn--long-active" : ""}`} onClick={() => setDirection("long")}>
                      <span className="jx-dirbig__icon"><TrendingUp size={16} /></span>
                      <span className="jx-dirbig__title">Long</span>
                    </button>
                    <button type="button" className={`jx-dirbig__btn ${direction === "short" ? "jx-dirbig__btn--short-active" : ""}`} onClick={() => setDirection("short")}>
                      <span className="jx-dirbig__icon"><TrendingDown size={16} /></span>
                      <span className="jx-dirbig__title">Short</span>
                    </button>
                  </div>
                </div>

                <div className="jx-field">
                  <label className="jx-field__label" style={{ font: "var(--text-small)", fontWeight: 500 }}>Position size</label>
                  <div style={{ display: "flex", gap: "var(--space-2)", minWidth: 0 }}>
                    <div className="jx-input" style={{ flex: 1, minWidth: 0 }}><input type="number" step="any" placeholder="0.00" value={size} onChange={(e) => setSize(e.target.value)} /></div>
                    <div style={{ width: 92, flexShrink: 0 }}>
                      <Dropdown value={sizeUnit} onChange={setSizeUnit} options={[{ value: "asset", label: "Asset" }, { value: "usd", label: "USD" }]} />
                    </div>
                  </div>
                </div>

                {/* editable entry/exit — type exact prices or click the chart */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)", minWidth: 0 }}>
                  <div className="jx-field" style={{ minWidth: 0 }}>
                    <label className="jx-field__label" style={{ font: "var(--text-small)", fontWeight: 500 }}>Entry price</label>
                    <div className="jx-input" style={{ minWidth: 0 }}>
                      <input type="number" step="any" placeholder="0.00" value={entry?.price ?? ""}
                        onChange={(e) => { const v = e.target.value; setEntry(v === "" ? null : { price: round2(v), time: entry?.time ?? null }); }} />
                    </div>
                  </div>
                  <div className="jx-field" style={{ minWidth: 0 }}>
                    <label className="jx-field__label" style={{ font: "var(--text-small)", fontWeight: 500 }}>Exit price</label>
                    <div className="jx-input" style={{ minWidth: 0 }}>
                      <input type="number" step="any" placeholder="0.00" value={exit?.price ?? ""}
                        onChange={(e) => { const v = e.target.value; setExit(v === "" ? null : { price: round2(v), time: exit?.time ?? null }); }} />
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)", minWidth: 0 }}>
                  <div className="jx-field" style={{ minWidth: 0 }}>
                    <label className="jx-field__label" style={{ font: "var(--text-small)", fontWeight: 500 }}>Stop</label>
                    <div className="jx-input" style={{ minWidth: 0 }}><input type="number" step="any" placeholder="0.00" value={stop} onChange={(e) => setStop(e.target.value)} /></div>
                  </div>
                  <div className="jx-field" style={{ minWidth: 0 }}>
                    <label className="jx-field__label" style={{ font: "var(--text-small)", fontWeight: 500 }}>Target</label>
                    <div className="jx-input" style={{ minWidth: 0 }}><input type="number" step="any" placeholder="0.00" value={tp} onChange={(e) => setTp(e.target.value)} /></div>
                  </div>
                </div>

                <div className="jx-field">
                  <label className="jx-field__label" style={{ font: "var(--text-small)", fontWeight: 500 }}>Note</label>
                  <div className="jx-input"><input placeholder="Optional" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
                </div>

                {/* live preview */}
                <div className="jx-card jx-card--flat" style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ font: "var(--text-label)", letterSpacing: ".6px", textTransform: "uppercase", color: "var(--color-text-muted)" }}>Live preview</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ font: "var(--text-title)" }}>{symbol}</span>
                    <Badge variant={direction === "long" ? "success" : "danger"}>{direction === "long" ? "Long" : "Short"}</Badge>
                  </div>
                  <span style={{ font: "var(--text-h2)", color: calc.pnl == null ? "var(--color-text-muted)" : calc.pnl >= 0 ? "var(--color-success-strong)" : "var(--color-danger-strong)" }}>
                    {calc.pnl == null ? "P&L —" : cmoney(calc.pnl)}
                    {calc.retPct != null && <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)", marginLeft: 8 }}>{calc.retPct >= 0 ? "+" : ""}{fmt(calc.retPct, 1)}%</span>}
                  </span>
                  {calc.rr != null && <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>Planned R:R 1 : {fmt(calc.rr, 1)}</span>}
                </div>
              </div>
            </div>

            <div className="jx-ltmodal__footer" style={{ justifyContent: "flex-end" }}>
              <button className="jx-btn jx-btn--ghost" onClick={onClose} disabled={saving}>Cancel</button>
              <button className="jx-btn jx-btn--primary" onClick={save} disabled={saving || !canSave} style={{ minWidth: 130 }}>
                {saving ? <><Spinner /> Saving…</> : <><Check size={16} /> {annotateMode ? "Save chart" : "Log trade"}</>}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
