"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CandlestickChart,
  Check,
  ChevronRight,
  Clock,
  Crown,
  Download,
  Flame,
  Image as ImageIcon,
  Pencil,
  Star,
  Target,
  Trash2,
  TrendingUp,
  User,
  X,
  Zap,
} from "lucide-react";
import axios from "axios";
import Badge from "./Badge";
import Button from "./Button";
import Dropdown from "./Dropdown";
import TradeChartMarker from "./TradeChartMarker";
import ChartTradeModal from "./ChartTradeModal";
import { getLivePrice } from "@/utils/livePrice";
import { getFromIndexedDB, saveToIndexedDB } from "@/utils/indexedDB";
import { getPlanRules, countChartLogsThisMonth, canChartLog, lockedChartTradeIds } from "@/utils/planRestrictions";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

/* Figma "Trade Details · Desktop" (22753:54032) — gamified: every
   field captured in the log modal is surfaced. "If you had held"
   uses LIVE prices (Binance public ticker, refreshed every 30s) for
   crypto symbols, with a clearly-labeled simulation fallback. */

const fmt = (v, d = 2) => Number(v).toLocaleString(undefined, { maximumFractionDigits: d });
/* details view shows FULL numbers with 2 decimals (not compact k/M),
   with a signed prefix for money values */
const kf = (v, sym = "$") => `${v < 0 ? "−" : "+"}${sym}${fmt(Math.abs(Number(v) || 0), 2)}`;
const dt = (v) =>
  v ? new Date(v).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

const detectSession = (iso) => {
  if (!iso) return null;
  const h = new Date(iso).getUTCHours();
  if (h < 7) return "Asia session";
  if (h < 13) return "London session";
  if (h < 21) return "New York session";
  return "Sydney session";
};

function MiniArea({ from, to, height = 140 }) {
  const id = useId();
  const values = useMemo(() => {
    const n = 14;
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const base = from + (to - from) * t;
      const wiggle = Math.sin(i * 2.4) * Math.abs(to - from) * 0.12;
      out.push(base + (i === 0 || i === n - 1 ? 0 : wiggle));
    }
    return out;
  }, [from, to]);
  const w = 600;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const p = values.map((v, i) => [6 + (i / (values.length - 1)) * (w - 12), height - 6 - ((v - min) / span) * (height - 12)]);
  const line = p.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${height}`} style={{ width: "100%", display: "block" }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--yellow-300)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--yellow-300)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${p[p.length - 1][0]},${height} L${p[0][0]},${height} Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke="var(--yellow-400)" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

/* bento detail cell — label on top, value below, light border */
function DetailRow({ label, value, valueEl }) {
  return (
    <div
      style={{
        display: "flex", flexDirection: "column", gap: 3,
        padding: "var(--space-2) var(--space-3)",
        background: "var(--color-bg-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-sm)",
        font: "var(--text-small)",
        minWidth: 0,
      }}
    >
      <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>{label}</span>
      {valueEl || <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>{value ?? "—"}</span>}
    </div>
  );
}

function QualityRing({ pct, size = 96 }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 96 96">
      <circle cx="48" cy="48" r={r} fill="none" stroke="var(--color-bg-muted)" strokeWidth="9" />
      <circle cx="48" cy="48" r={r} fill="none" stroke="var(--color-primary)" strokeWidth="9" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} transform="rotate(-90 48 48)" />
      <text x="48" y="46" textAnchor="middle" style={{ font: "600 18px Poppins", fill: "var(--color-text-primary)" }}>{pct}%</text>
      <text x="48" y="62" textAnchor="middle" style={{ font: "400 9px Poppins", fill: "var(--color-text-muted)" }}>quality</text>
    </svg>
  );
}

export default function TradeDetailsModal({
  open,
  trade,
  currencySymbol = "$",
  onClose,
  onEdit,
  onDelete,
  onImageClick,
  onTradeUpdated,
}) {
  // localTrade lets us reflect a freshly-saved chart annotation without a refetch
  const [localTrade, setLocalTrade] = useState(null);
  const [userData, setUserData] = useState(null);
  const [showAnnotate, setShowAnnotate] = useState(false);

  useEffect(() => {
    // reset local copy whenever a different trade opens
    setLocalTrade(null);
    setShowAnnotate(false);
  }, [trade?._id]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try { setUserData(await getFromIndexedDB("user-data")); } catch {}
    })();
  }, [open]);

  const t = localTrade || trade || {};
  const isLong = t.direction?.toLowerCase() === "long";
  const pnl = Number(t.pnl) || 0;
  const entry = Number(t.avgEntryPrice ?? t.entryPrice ?? t.entries?.[0]?.price) || 0;
  const exit = Number(t.avgExitPrice ?? t.exitPrice ?? t.exits?.[0]?.price) || 0;
  const sl = Number(t.avgSLPrice ?? t.sls?.[0]?.price) || 0;
  const tp = Number(t.avgTPPrice ?? t.tps?.[0]?.price) || 0;
  const size = t.totalQuantity ?? null;
  const notional = entry && size ? entry * size : null;
  const retPct = pnl != null && notional ? (pnl / notional) * 100 : null;
  const isQuickLog = t.tradeStatus === "quick";
  const strategy = t.strategy || t.reason?.[0] || null;
  const confidence = Number(t.confidence) || 0;
  const session = detectSession(t.openTime);
  const images = (t.images || []).map((i) => (typeof i === "string" ? { url: i } : i)).filter((i) => i?.url);

  /* ---- chart annotation (mark entry/exit when there are no screenshots) ---- */
  const hasChart = !!t.tvChart || t.source === "tradingview";
  const canShowAnnotate = open && images.length === 0 && !hasChart;
  const chartRules = getPlanRules(userData);
  const chartLimit = chartRules.limits.chartLogLimitPerMonth ?? Infinity;
  const chartUsed = countChartLogsThisMonth(userData);
  const chartAllowed = canChartLog(userData);
  // free users over their monthly allowance → blur the chart with an upgrade gate
  const chartLocked = lockedChartTradeIds(userData).has(t._id);

  const onAnnotated = async (updated) => {
    if (updated) {
      setLocalTrade(updated);
      onTradeUpdated?.(updated);
      try {
        const ud = (await getFromIndexedDB("user-data")) || {};
        ud.trades = (ud.trades || []).map((x) => (x._id === updated._id ? { ...x, ...updated } : x));
        await saveToIndexedDB("user-data", ud);
        setUserData(ud);
      } catch {}
    }
    setShowAnnotate(false);
  };

  const duration = t.openTime && t.closeTime
    ? (() => {
        const ms = new Date(t.closeTime) - new Date(t.openTime);
        return ms > 0 ? `${Math.floor(ms / 36e5)}h ${Math.round((ms % 36e5) / 6e4)}m` : "—";
      })()
    : "—";

  /* gamified quality + XP — same scoring as the log modal */
  const checks = [
    { label: "Risk set (SL/TP)", xp: 20, ok: sl > 0 && tp > 0 },
    { label: "Strategy tagged", xp: 10, ok: !!strategy },
    { label: "Emotion logged", xp: 10, ok: !!t.emotion },
    { label: "Notes added", xp: 10, ok: !!(t.learnings || "").trim() },
    { label: "Screenshot", xp: 15, ok: images.length > 0 },
  ];
  let quality = 0;
  if (t.symbol) quality += 10;
  if (entry && exit && size) quality += 25;
  quality += checks.reduce((s, c) => s + (c.ok ? c.xp : 0), 0);
  quality = Math.min(100, isQuickLog ? Math.min(quality, 45) : quality);
  const xp = checks.reduce((s, c) => s + (c.ok ? c.xp : 0), 0) + (isQuickLog ? 20 : 0);

  const isRunning = t.tradeStatus === "running";

  /* LIVE price from Binance (faster refresh for running trades) with a
     deterministic simulation fallback for non-crypto symbols */
  const [live, setLive] = useState(null);
  const [liveDir, setLiveDir] = useState(0); // +1 up, -1 down, 0 flat — drives the flash
  const prevPriceRef = useRef(null);
  useEffect(() => {
    if (!open || !trade) {
      setLive(null);
      prevPriceRef.current = null;
      setLiveDir(0);
      return;
    }
    let stopped = false;
    const load = async () => {
      const price = await getLivePrice(trade.symbol || trade.ticker);
      if (stopped || !price) return;
      const prev = prevPriceRef.current;
      if (prev != null && price !== prev) setLiveDir(price > prev ? 1 : -1);
      prevPriceRef.current = price;
      setLive({ price, at: new Date() });
    };
    load();
    const id = setInterval(load, isRunning ? 8_000 : 30_000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [open, trade, isRunning]);

  const drift = ((String(t._id || t.symbol || "x").split("").reduce((s, c) => s + c.charCodeAt(0), 0) % 9) - 2) / 100;
  const isLiveHeld = !!live?.price;
  const heldPrice = isLiveHeld ? live.price : (exit || entry) * (1 + drift);
  const heldPnl = entry && size ? (heldPrice - entry) * size * (isLong ? 1 : -1) : null;
  const heldDelta = heldPnl != null ? heldPnl - pnl : null;
  // unrealized return for a running position
  const liveRetPct = entry ? ((heldPrice - entry) / entry) * 100 * (isLong ? 1 : -1) : null;

  const stats = [
    ["Entry", entry ? `$${fmt(entry)}` : "—"],
    ["Exit", exit ? `$${fmt(exit)}` : "—"],
    ["Size", size != null ? fmt(size, 2) : "—"],
    ["Net P&L", kf(pnl, currencySymbol), pnl >= 0 ? "var(--color-success-strong)" : "var(--color-danger-strong)"],
    ["Return", retPct != null ? `${retPct >= 0 ? "+" : ""}${fmt(retPct, 1)}%` : "—", retPct != null ? (retPct >= 0 ? "var(--color-success-strong)" : "var(--color-danger-strong)") : undefined],
    ["R : R", t.rr ? (String(t.rr).includes(":") ? t.rr : `1 : ${fmt(t.rr, 1)}`) : "—"],
    ["Fees", t.feeAmount ? `$${fmt(t.feeAmount)}` : "—"],
    ["Duration", duration],
  ];

  const chipRow = (label, items, variant = "neutral") =>
    items?.length ? (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>{label}</span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {items.map((m) => (
            <Badge key={m} variant={variant}>{m}</Badge>
          ))}
        </div>
      </div>
    ) : null;

  // a labelled field with a graceful empty state — keeps the edge &
  // psychology grid aligned even when some values are missing
  const field = (label, node) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {node ?? <span style={{ font: "var(--text-small)", color: "var(--color-text-muted)" }}>—</span>}
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {open && trade && (
        <motion.div
          className="jx-modal-overlay jx-modal-overlay--blur"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="jx-ltmodal"
            style={{ width: "min(980px, 96vw)" }}
          >
            {/* header */}
            <div className="jx-ltmodal__header" style={{ alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
                  <span style={{ font: "var(--text-h2)" }}>{t.symbol || t.ticker || "—"}</span>
                  <Badge variant={isLong ? "success" : "danger"}>{isLong ? "Long" : "Short"}</Badge>
                  <Badge variant={pnl >= 0 ? "success" : "danger"}>{pnl >= 0 ? "Win" : "Loss"}</Badge>
                  <Badge variant="brand">
                    {t.source === "auto" ? <Download size={11} /> : <User size={11} />}
                    {t.source === "auto" ? "Auto-imported" : isQuickLog ? "Quick log" : "Manual"}
                  </Badge>
                  {session && <Badge variant="neutral"><Clock size={11} /> {session}</Badge>}
                </div>
                <span style={{ font: "var(--text-small)", color: "var(--color-text-muted)" }}>
                  Opened {dt(t.openTime)} → Closed {dt(t.closeTime)}
                </span>
              </div>
              <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                <Button variant="outline" size="sm" icon={Pencil} onClick={() => onEdit?.(t)}>Edit trade</Button>
                <Button variant="danger-outline" size="sm" icon={Trash2} onClick={() => onDelete?.(t)}>Delete</Button>
                <button className="jx-btn jx-btn--secondary jx-btn--sm" onClick={onClose} aria-label="Close" style={{ padding: 8 }}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* body */}
            <div className="jx-ltmodal__body">
              <div className="jx-ltmodal__form" style={{ gap: "var(--space-4)" }}>
                {/* stats — bento grid of bordered cells */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(108px, 1fr))", gap: "var(--space-2)" }}>
                  {stats.map(([l, v, color]) => (
                    <div
                      key={l}
                      style={{
                        display: "flex", flexDirection: "column", gap: 3,
                        padding: "var(--space-3)",
                        background: "var(--color-bg-surface)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-md)",
                      }}
                    >
                      <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>{l}</span>
                      <span style={{ font: "var(--text-body-md)", fontWeight: 600, color: color || "var(--color-text-primary)" }}>{v}</span>
                    </div>
                  ))}
                </div>

                {/* price action */}
                {entry > 0 && exit > 0 && (
                  <div className="jx-card jx-card--flat">
                    <div style={{ font: "var(--text-body-md)", fontWeight: 600 }}>Price action · {t.symbol || t.ticker}</div>
                    <div style={{ font: "var(--text-h2)" }}>${fmt(exit)}</div>
                    <Badge variant={exit >= entry ? "success" : "danger"}>
                      {exit >= entry ? "+" : ""}{fmt(((exit - entry) / entry) * 100, 1)}% over the trade
                    </Badge>
                    <div style={{ marginTop: "var(--space-3)" }}>
                      <MiniArea from={entry} to={exit} />
                    </div>
                  </div>
                )}

                {/* live position — running trade vs current price */}
                {isRunning && heldPnl != null && (
                  <div className="jx-card jx-card--flat">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-2)" }}>
                      <div>
                        <div style={{ font: "var(--text-body-md)", fontWeight: 600 }}>Live position</div>
                        <div style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>This trade is open — tracking live P&amp;L vs your entry</div>
                      </div>
                      {isLiveHeld ? (
                        <span className="jx-badge jx-badge--success" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.6 }} style={{ width: 7, height: 7, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
                          Live · {live.at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      ) : (
                        <span className="jx-badge jx-badge--neutral">● Simulated · no live feed for this symbol</span>
                      )}
                    </div>
                    <div className="jx-held-grid" style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: "var(--space-3)", marginTop: "var(--space-3)" }}>
                      <div style={{ background: "var(--color-bg-muted)", borderRadius: "var(--radius-md)", padding: "var(--space-4)" }}>
                        <div style={{ font: "var(--text-label)", letterSpacing: ".6px", textTransform: "uppercase", color: "var(--color-text-muted)" }}>Your entry</div>
                        <div style={{ font: "var(--text-h2)" }}>${fmt(entry)}</div>
                        <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                          {isLong ? "Long" : "Short"}{size ? ` · ${fmt(size, 2)} units` : ""}
                        </span>
                      </div>
                      <motion.div animate={{ x: liveDir > 0 ? 2 : liveDir < 0 ? -2 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 18 }} style={{ color: liveDir > 0 ? "var(--color-success)" : liveDir < 0 ? "var(--color-danger)" : "var(--color-text-muted)" }}>
                        {liveDir > 0 ? <TrendingUp size={18} /> : liveDir < 0 ? <TrendingUp size={18} style={{ transform: "rotate(180deg)" }} /> : <ChevronRight size={18} />}
                      </motion.div>
                      <div style={{ background: "var(--color-primary-subtle)", border: "1px solid var(--color-primary)", borderRadius: "var(--radius-md)", padding: "var(--space-4)", overflow: "hidden" }}>
                        <div style={{ font: "var(--text-label)", letterSpacing: ".6px", textTransform: "uppercase", color: "var(--color-text-muted)" }}>Live price</div>
                        <AnimatePresence mode="popLayout" initial={false}>
                          <motion.div
                            key={Math.round(heldPrice * 100)}
                            initial={{ opacity: 0, y: liveDir < 0 ? -14 : 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: liveDir < 0 ? 14 : -14 }}
                            transition={{ type: "spring", stiffness: 320, damping: 26 }}
                            style={{ font: "var(--text-h2)", color: liveDir > 0 ? "var(--color-success-strong)" : liveDir < 0 ? "var(--color-danger-strong)" : "var(--color-text-primary)" }}
                          >
                            ${fmt(heldPrice)}
                          </motion.div>
                        </AnimatePresence>
                        <span style={{ font: "var(--text-caption)", color: heldPnl >= 0 ? "var(--color-success)" : "var(--color-danger)" }}>
                          Unrealized {kf(heldPnl, currencySymbol)}{liveRetPct != null ? ` · ${liveRetPct >= 0 ? "+" : ""}${fmt(liveRetPct, 2)}%` : ""}
                        </span>
                      </div>
                    </div>
                    <div className="jx-banner jx-banner--warn" style={{ marginTop: "var(--space-3)" }}>
                      <TrendingUp size={15} style={{ color: "var(--yellow-500)" }} />
                      <span style={{ font: "var(--text-small)" }}>
                        {heldPnl >= 0
                          ? <>You&apos;re <strong>up {kf(heldPnl, currencySymbol)}</strong> on this open position. Set a target or trail your stop to lock it in.</>
                          : <>You&apos;re <strong>down {kf(Math.abs(heldPnl), currencySymbol)}</strong> on this open position — check it&apos;s still within your planned risk.</>}
                      </span>
                    </div>
                  </div>
                )}

                {/* if you had held — closed trades */}
                {!isRunning && heldPnl != null && (
                  <div className="jx-card jx-card--flat">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-2)" }}>
                      <div>
                        <div style={{ font: "var(--text-body-md)", fontWeight: 600 }}>If you had held</div>
                        <div style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>Where price is now vs the exit you took</div>
                      </div>
                      {isLiveHeld ? (
                        <span className="jx-badge jx-badge--success">
                          ● Live ·{" "}
                          {live.at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      ) : (
                        <span className="jx-badge jx-badge--neutral">● Simulated · no live feed for this symbol</span>
                      )}
                    </div>
                    <div className="jx-held-grid" style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: "var(--space-3)", marginTop: "var(--space-3)" }}>
                      <div style={{ background: "var(--color-bg-muted)", borderRadius: "var(--radius-md)", padding: "var(--space-4)" }}>
                        <div style={{ font: "var(--text-label)", letterSpacing: ".6px", textTransform: "uppercase", color: "var(--color-text-muted)" }}>Your exit</div>
                        <div style={{ font: "var(--text-h2)" }}>${fmt(exit)}</div>
                        <span style={{ font: "var(--text-caption)", color: pnl >= 0 ? "var(--color-success)" : "var(--color-danger)" }}>
                          Realized {kf(pnl, currencySymbol)}
                        </span>
                      </div>
                      <ChevronRight size={18} style={{ color: "var(--color-text-muted)" }} />
                      <div style={{ background: "var(--color-primary-subtle)", border: "1px solid var(--color-primary)", borderRadius: "var(--radius-md)", padding: "var(--space-4)" }}>
                        <div style={{ font: "var(--text-label)", letterSpacing: ".6px", textTransform: "uppercase", color: "var(--color-text-muted)" }}>If held to today</div>
                        <div style={{ font: "var(--text-h2)" }}>${fmt(heldPrice)}</div>
                        <span style={{ font: "var(--text-caption)", color: heldPnl >= 0 ? "var(--color-success)" : "var(--color-danger)" }}>
                          Unrealized {kf(heldPnl, currencySymbol)}
                        </span>
                      </div>
                    </div>
                    <div className="jx-banner jx-banner--warn" style={{ marginTop: "var(--space-3)" }}>
                      <TrendingUp size={15} style={{ color: "var(--yellow-500)" }} />
                      <span style={{ font: "var(--text-small)" }}>
                        {heldDelta >= 0
                          ? <>Holding to today would have earned <strong>{kf(heldDelta, currencySymbol)} more</strong>.</>
                          : <>Good exit — holding would have given back <strong>{kf(Math.abs(heldDelta), currencySymbol)}</strong>.</>}
                      </span>
                    </div>
                  </div>
                )}

                {/* your edge & psychology */}
                <div className="jx-card jx-card--flat" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                  <div style={{ font: "var(--text-body-md)", fontWeight: 600 }}>Your edge &amp; psychology</div>

                  {/* aligned grid of context fields */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "var(--space-4)" }}>
                    {field("Strategy", strategy ? <Badge variant="brand">{strategy}</Badge> : null)}
                    {field("Market", t.marketCondition ? <Badge variant="neutral">{t.marketCondition}</Badge> : null)}
                    {field("Timeframe", t.timeframe ? <Badge variant="neutral">{t.timeframe}</Badge> : null)}
                    {field("Emotion at entry", t.emotion ? <Badge variant="brand">{t.emotion}</Badge> : null)}
                    {field(
                      "Confidence",
                      confidence > 0 ? (
                        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star key={n} size={14} fill={n <= confidence ? "var(--color-primary)" : "none"} color={n <= confidence ? "var(--yellow-500)" : "var(--color-border-strong)"} />
                          ))}
                          <span style={{ font: "var(--text-caption)", fontWeight: 600, marginLeft: 4 }}>
                            {confidence <= 2 ? "Low" : confidence === 3 ? "Medium" : "High"}
                          </span>
                        </span>
                      ) : null,
                    )}
                    {field(
                      "Followed the plan?",
                      <Badge variant={t.rulesFollowed ? "success" : "danger"}>
                        {t.rulesFollowed ? <><Check size={11} /> Yes</> : "No"}
                      </Badge>,
                    )}
                  </div>

                  {/* mistakes span full width when present */}
                  {t.mistakes?.length > 0 && (
                    <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-3)" }}>
                      {chipRow("Mistakes to avoid", t.mistakes, "danger")}
                    </div>
                  )}
                </div>

                {/* notes */}
                <div className="jx-card jx-card--flat">
                  <div style={{ font: "var(--text-body-md)", fontWeight: 600, marginBottom: "var(--space-2)" }}>Trade notes</div>
                  <p style={{ margin: 0, font: "var(--text-body)", color: "var(--color-text-secondary)" }}>
                    {t.learnings || "No notes were logged for this trade."}
                  </p>
                </div>

                {/* TradingView-marked chart (when sourced from TV / no screenshots) */}
                {(t.source === "tradingview" || (t.tvChart && images.length === 0)) && (
                  <div className="jx-card jx-card--flat">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
                      <span style={{ font: "var(--text-body-md)", fontWeight: 600 }}>Chart — entry &amp; exit</span>
                      <Badge variant="brand">Read-only</Badge>
                    </div>
                    {chartLocked ? (
                      <div style={{ position: "relative", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                        <div style={{ filter: "blur(7px)", pointerEvents: "none", userSelect: "none" }} aria-hidden="true">
                          <TradeChartMarker trade={t} />
                        </div>
                        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "var(--space-3)", textAlign: "center", padding: "var(--space-4)", background: "color-mix(in srgb, var(--color-bg-surface) 55%, transparent)" }}>
                          <span style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--color-primary-subtle)", color: "var(--yellow-500)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Crown size={22} />
                          </span>
                          <span style={{ font: "var(--text-body-md)", fontWeight: 600, maxWidth: 320 }}>
                            You&apos;ve used your 5 free chart logs this month
                          </span>
                          <span style={{ font: "var(--text-caption)", color: "var(--color-text-secondary)", maxWidth: 320 }}>
                            Upgrade to Pro to view unlimited chart logs.
                          </span>
                          <a href="/pricing" style={{ textDecoration: "none" }}>
                            <Button variant="primary" size="sm" icon={Crown}>Upgrade to view</Button>
                          </a>
                        </div>
                      </div>
                    ) : (
                      <TradeChartMarker trade={t} />
                    )}
                  </div>
                )}

                {/* chart annotation — only when there are no screenshots & no chart yet */}
                {canShowAnnotate && (
                  <div className="jx-card jx-card--flat">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)", flexWrap: "wrap", gap: 8 }}>
                      <span style={{ font: "var(--text-body-md)", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                        <CandlestickChart size={16} style={{ color: "var(--yellow-500)" }} /> Annotate on chart
                      </span>
                      {chartLimit !== Infinity && (
                        <Badge variant={chartAllowed ? "neutral" : "danger"}>
                          {Math.min(chartUsed, chartLimit)} / {chartLimit} this month
                        </Badge>
                      )}
                    </div>
                    <p style={{ margin: "0 0 var(--space-3)", font: "var(--text-small)", color: "var(--color-text-muted)" }}>
                      No screenshot? Open the live chart for {t.symbol || "this symbol"} with your entry &amp; exit prefilled — adjust by typing or clicking, switch timeframes, and save a read-only chart. P&amp;L updates with your marks.
                    </p>
                    {chartAllowed ? (
                      <Button variant="primary" icon={CandlestickChart} onClick={() => setShowAnnotate(true)}>
                        Annotate on chart
                      </Button>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap", padding: "var(--space-3) var(--space-4)", background: "var(--color-primary-subtle)", border: "1px solid var(--color-primary)", borderRadius: "var(--radius-md)" }}>
                        <Crown size={18} style={{ color: "var(--yellow-500)", flexShrink: 0 }} />
                        <span style={{ flex: 1, minWidth: 160, font: "var(--text-caption)", color: "var(--color-text-secondary)" }}>
                          You&apos;ve used all {chartLimit} chart logs this month. Upgrade to Pro for unlimited chart logging.
                        </span>
                        <a href="/pricing" style={{ textDecoration: "none" }}>
                          <Button variant="primary" size="sm">Upgrade</Button>
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* screenshots — real B2 urls */}
                <div className="jx-card jx-card--flat">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
                    <span style={{ font: "var(--text-body-md)", fontWeight: 600 }}>Screenshots &amp; attachments</span>
                    {images.length > 0 && <Badge variant="neutral"><ImageIcon size={11} /> {images.length}/4</Badge>}
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
                    {images.map((img, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={img.url}
                        src={img.url}
                        alt={`screenshot ${i + 1}`}
                        loading="lazy"
                        decoding="async"
                        onClick={() => onImageClick?.(t)}
                        style={{ width: 150, height: 96, objectFit: "cover", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", cursor: "zoom-in" }}
                      />
                    ))}
                    <button className="jx-dropzone" style={{ width: 150, height: 96, padding: 0, gap: 4 }} onClick={() => onImageClick?.(t)}>
                      <ImageIcon size={15} /> {images.length ? "View / manage" : "Add screenshots"}
                    </button>
                  </div>
                </div>
              </div>

              {/* right rail */}
              <div className="jx-ltmodal__rail">
                {/* gamified quality */}
                <div className="jx-card jx-card--flat" style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <QualityRing pct={quality} />
                  <span style={{ font: "var(--text-title)" }}>
                    {quality >= 70 ? "Strong log" : quality >= 40 ? "Good log" : "Basic log"}
                  </span>
                  <span className="jx-badge jx-badge--brand"><Zap size={11} /> +{xp} XP earned</span>
                  <div style={{ width: "100%", marginTop: 4 }}>
                    {checks.map((c) => (
                      <div key={c.label} className={`jx-xp-row ${c.ok ? "" : "jx-xp-row--off"}`}>
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Check size={13} style={{ color: c.ok ? "var(--color-success)" : "var(--color-text-disabled)" }} />
                          {c.label}
                        </span>
                        <span>+{c.xp}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="jx-card jx-card--flat" style={{ padding: "var(--space-4)" }}>
                  <div style={{ font: "var(--text-body-md)", fontWeight: 600, marginBottom: "var(--space-3)" }}>Trade details</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
                    <DetailRow label="Date opened" value={dt(t.openTime)} />
                    <DetailRow label="Date closed" value={dt(t.closeTime)} />
                    <DetailRow label="Direction" value={isLong ? "Long" : "Short"} />
                    <DetailRow label="Status" valueEl={<Badge variant="neutral">{t.tradeStatus || "closed"}</Badge>} />
                    <DetailRow label="Size unit" value={t.sizeUnit ? t.sizeUnit.toUpperCase() : "—"} />
                    <DetailRow label="Leverage" value={t.leverage && t.leverage !== 1 ? `${t.leverage}×` : "—"} />
                    <DetailRow label="Margin (USD)" value={t.quantityUSD ? `$${fmt(t.quantityUSD)}` : "—"} />
                    <DetailRow
                      label="Source"
                      valueEl={
                        <span className="jx-badge jx-badge--neutral">
                          {t.source === "auto" ? <Download size={11} /> : <User size={11} />}
                          {t.source === "auto" ? "Exchange" : t.source === "tradingview" ? "Chart" : "Manual"}
                        </span>
                      }
                    />
                  </div>
                </div>

                <div className="jx-card jx-card--flat" style={{ padding: "var(--space-4)" }}>
                  <div style={{ font: "var(--text-body-md)", fontWeight: 600, marginBottom: "var(--space-3)" }}>Risk management</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
                    <DetailRow label="Stop loss" value={sl ? `$${fmt(sl)}` : "—"} />
                    <DetailRow label="Take profit" value={tp ? `$${fmt(tp)}` : "—"} />
                    <DetailRow label="Expected profit" value={t.expectedProfit ? `$${fmt(t.expectedProfit, 0)}` : "—"} />
                    <DetailRow label="Expected loss" value={t.expectedLoss ? `$${fmt(t.expectedLoss, 0)}` : "—"} />
                    <DetailRow
                      label="Planned R:R"
                      valueEl={
                        <span style={{ fontWeight: 600, color: t.rr ? "var(--color-success-strong)" : "var(--color-text-primary)" }}>
                          {t.rr ? (String(t.rr).includes(":") ? t.rr : `1 : ${fmt(t.rr, 1)}`) : "—"}
                        </span>
                      }
                    />
                  </div>
                </div>

                <div className="jx-banner jx-banner--warn" style={{ alignItems: "flex-start" }}>
                  <Flame size={15} style={{ color: "var(--yellow-500)", flexShrink: 0, marginTop: 2 }} />
                  <span style={{ font: "var(--text-caption)" }}>
                    {t.rulesFollowed
                      ? "Disciplined execution — trades like this compound your edge."
                      : "Tag what pulled you off-plan; patterns beat willpower."}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* annotate-on-chart (interactive) — opens over the details modal */}
          <ChartTradeModal
            open={showAnnotate}
            annotateMode
            initialTrade={t}
            onClose={() => setShowAnnotate(false)}
            onAnnotated={onAnnotated}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
