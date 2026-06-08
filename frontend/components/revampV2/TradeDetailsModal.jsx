"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronRight,
  Clock,
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
import Badge from "./Badge";
import Button from "./Button";
import { getLivePrice } from "@/utils/livePrice";

/* Figma "Trade Details · Desktop" (22753:54032) — gamified: every
   field captured in the log modal is surfaced. "If you had held"
   uses LIVE prices (Binance public ticker, refreshed every 30s) for
   crypto symbols, with a clearly-labeled simulation fallback. */

const fmt = (v, d = 2) => Number(v).toLocaleString(undefined, { maximumFractionDigits: d });
const kf = (v, sym = "$") => {
  const a = Math.abs(v);
  const s = a >= 1000 ? `${sym}${fmt(a / 1000, 2)}k` : `${sym}${fmt(a)}`;
  return `${v < 0 ? "−" : "+"}${s}`;
};
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

function DetailRow({ label, value, valueEl }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", padding: "7px 0", font: "var(--text-small)" }}>
      <span style={{ color: "var(--color-text-muted)" }}>{label}</span>
      {valueEl || <span style={{ fontWeight: 600, textAlign: "right" }}>{value ?? "—"}</span>}
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
}) {
  const t = trade || {};
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

  /* "If you had held" — LIVE price from Binance (30s refresh) with a
     deterministic simulation fallback for non-crypto symbols */
  const [live, setLive] = useState(null);
  useEffect(() => {
    if (!open || !trade) {
      setLive(null);
      return;
    }
    let stopped = false;
    const load = async () => {
      const price = await getLivePrice(trade.symbol || trade.ticker);
      if (!stopped && price) setLive({ price, at: new Date() });
    };
    load();
    const id = setInterval(load, 30_000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [open, trade]);

  const drift = ((String(t._id || t.symbol || "x").split("").reduce((s, c) => s + c.charCodeAt(0), 0) % 9) - 2) / 100;
  const isLiveHeld = !!live?.price;
  const heldPrice = isLiveHeld ? live.price : exit * (1 + drift);
  const heldPnl = entry && size ? (heldPrice - entry) * size * (isLong ? 1 : -1) : null;
  const heldDelta = heldPnl != null ? heldPnl - pnl : null;

  const stats = [
    ["Entry", entry ? `$${fmt(entry)}` : "—"],
    ["Exit", exit ? `$${fmt(exit)}` : "—"],
    ["Size", size ?? "—"],
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
            <div className="jx-ltmodal__body" style={{ gridTemplateColumns: "minmax(0,1.6fr) 300px" }}>
              <div className="jx-ltmodal__form" style={{ gap: "var(--space-4)" }}>
                {/* stats strip */}
                <div className="jx-card jx-card--flat" style={{ padding: "var(--space-4)", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "var(--space-3)" }}>
                  {stats.map(([l, v, color]) => (
                    <span key={l} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>{l}</span>
                      <span style={{ font: "var(--text-body-md)", fontWeight: 600, color: color || "var(--color-text-primary)" }}>{v}</span>
                    </span>
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

                {/* if you had held — simulated */}
                {heldPnl != null && (
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

                {/* your edge & psychology — gamified */}
                <div className="jx-card jx-card--flat" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                  <div style={{ font: "var(--text-body-md)", fontWeight: 600 }}>Your edge & psychology</div>
                  <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
                    {chipRow("Strategy", strategy ? [strategy] : null, "brand")}
                    {chipRow("Market", t.marketCondition ? [t.marketCondition] : null)}
                    {chipRow("Timeframe", t.timeframe ? [t.timeframe] : null)}
                    {chipRow("Emotion at entry", t.emotion ? [t.emotion] : null, "brand")}
                  </div>
                  {confidence > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)", marginRight: 4 }}>Confidence</span>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} size={16} fill={n <= confidence ? "var(--color-primary)" : "none"} color={n <= confidence ? "var(--yellow-500)" : "var(--color-border-strong)"} />
                      ))}
                      <span style={{ font: "var(--text-small)", fontWeight: 600 }}>
                        {confidence <= 2 ? "Low" : confidence === 3 ? "Medium" : "High"}
                      </span>
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
                    <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>Followed the plan?</span>
                    <Badge variant={t.rulesFollowed ? "success" : "danger"}>
                      {t.rulesFollowed ? <><Check size={11} /> Yes — disciplined</> : "No — review this one"}
                    </Badge>
                  </div>
                  {chipRow("Mistakes", t.mistakes?.length ? t.mistakes : null, "danger")}
                </div>

                {/* notes */}
                <div className="jx-card jx-card--flat">
                  <div style={{ font: "var(--text-body-md)", fontWeight: 600, marginBottom: "var(--space-2)" }}>Trade notes</div>
                  <p style={{ margin: 0, font: "var(--text-body)", color: "var(--color-text-secondary)" }}>
                    {t.learnings || "No notes were logged for this trade."}
                  </p>
                </div>

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
                  <div style={{ font: "var(--text-body-md)", fontWeight: 600, marginBottom: "var(--space-2)" }}>Trade details</div>
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
                        {t.source === "auto" ? "Exchange API" : "Manual entry"}
                      </span>
                    }
                  />
                </div>

                <div className="jx-card jx-card--flat" style={{ padding: "var(--space-4)" }}>
                  <div style={{ font: "var(--text-body-md)", fontWeight: 600, marginBottom: "var(--space-2)" }}>Risk management</div>
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
