"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, ExternalLink, EyeOff, Link2, Lock, RefreshCw, Share2, ShieldCheck } from "lucide-react";
import ov from "@/components/app/Overview.module.css";
import dt from "@/components/app/Data.module.css";
import Badge from "./Badge";
import Button from "./Button";
import Toast from "./Toast";

/**
 * SharePanel, generate a public, read-only link of your trades.
 * Data is encoded into the URL (no account access) and shortened
 * via TinyURL. Public page: /view-trades.
 */

const RANGES = [
  { id: "7", label: "Last 7 days", days: 7 },
  { id: "30", label: "Last 30 days", days: 30 },
  { id: "90", label: "Last 90 days", days: 90 },
  { id: "all", label: "All time", days: null },
];

const fmt = (v, d = 2) => Number(v).toLocaleString(undefined, { maximumFractionDigits: d });
const money = (v, sym = "$") => {
  const a = Math.abs(v);
  const s = a >= 1000 ? `${sym}${fmt(a / 1000, 2)}k` : `${sym}${fmt(a)}`;
  return `${v < 0 ? "−" : "+"}${s}`;
};

function Spinner() {
  return (
    <motion.span
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
      style={{
        width: 14, height: 14, borderRadius: "50%", display: "inline-block",
        border: "2px solid color-mix(in srgb, currentColor 30%, transparent)",
        borderTopColor: "currentColor",
      }}
    />
  );
}

export default function SharePanel({ trades = [], accountName = "My journal", currencySymbol = "$" }) {
  const [range, setRange] = useState("30");
  const [shortUrl, setShortUrl] = useState("");
  const [fullUrl, setFullUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState(null);
  const flash = (type, msg, ms = 3000) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), ms);
  };

  const filtered = useMemo(() => {
    const closed = trades.filter((t) => t.closeTime);
    const r = RANGES.find((x) => x.id === range);
    if (!r?.days) return closed;
    const from = Date.now() - r.days * 864e5;
    return closed.filter((t) => new Date(t.closeTime).getTime() >= from);
  }, [trades, range]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const wins = filtered.filter((t) => t.pnl > 0).length;
    const net = filtered.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
    return { total, winRate: total ? ((wins / total) * 100).toFixed(1) : "0", net };
  }, [filtered]);

  const generate = async () => {
    if (!filtered.length) return flash("danger", "No closed trades in this range");
    setBusy(true);
    setShortUrl("");
    try {
      const shareData = filtered.map((t) => ({
        symbol: t.symbol, direction: t.direction, quantityUSD: t.quantityUSD,
        leverage: t.leverage, totalQuantity: t.totalQuantity, tradeStatus: t.tradeStatus,
        feeAmount: t.feeAmount, pnlAfterFee: t.pnlAfterFee, pnl: t.pnl,
        openTime: t.openTime, closeTime: t.closeTime, duration: t.duration,
        rulesFollowed: t.rulesFollowed, reason: t.reason, rr: t.rr,
        avgEntryPrice: t.avgEntryPrice, avgExitPrice: t.avgExitPrice,
      }));
      const dataString = JSON.stringify({
        trades: shareData,
        meta: {
          totalTrades: shareData.length,
          timeRange: RANGES.find((x) => x.id === range)?.label,
          account: accountName,
          generatedAt: new Date().toISOString(),
          version: "2.0",
        },
      });
      const encoded = btoa(unescape(encodeURIComponent(dataString)));
      const url = `${window.location.origin}/view-trades?data=${encoded}`;
      setFullUrl(url);
      try {
        const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
        const short = await res.text();
        setShortUrl(short.startsWith("http") ? short : url);
      } catch {
        setShortUrl(url);
      }
      flash("success", "Share link ready");
    } catch (e) {
      console.error(e);
      flash("danger", "Could not generate link, try again");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shortUrl || fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      flash("danger", "Copy failed, select the link manually");
    }
  };

  // preview numbers + a tiny equity curve of the selected trades
  const sorted = useMemo(() => [...filtered].sort((a, b) => new Date(a.closeTime) - new Date(b.closeTime)), [filtered]);
  const best = sorted.length ? Math.max(...sorted.map((t) => Number(t.pnl) || 0)) : 0;
  const curve = useMemo(() => {
    let c = 0;
    const pts = sorted.map((t) => (c += Number(t.pnl) || 0));
    if (pts.length < 2) return null;
    const lo = Math.min(0, ...pts), hi = Math.max(0, ...pts), W = 300, H = 70;
    const y = (v) => H - 4 - ((v - lo) / (hi - lo || 1)) * (H - 8);
    const d = pts.map((v, i) => `${i ? "L" : "M"} ${(i / (pts.length - 1)) * W} ${y(v)}`).join(" ");
    return { d, area: `${d} L ${W} ${H} L 0 ${H} Z`, up: pts[pts.length - 1] >= 0, W, H };
  }, [sorted]);
  const link = shortUrl || fullUrl;
  const rangeLabel = RANGES.find((x) => x.id === range)?.label;
  const nativeShare = async () => {
    try { await navigator.share?.({ title: `${accountName} · trading performance`, url: link }); } catch {}
  };

  return (
    <div className={`${ov.root} ${dt.root}`}>
      <Toast toast={toast} />

      <header className={ov.head}>
        <div>
          <h1 className={ov.title}>Share your logs</h1>
          <p className={ov.sub}>Create a read-only link to your performance. Anyone with the link can view it, no login needed.</p>
        </div>
      </header>

      <div className={dt.split}>
        {/* ---- build the link ---- */}
        <section className={dt.card} aria-labelledby="sh-build">
          <div className={dt.cardHead}>
            <span className={dt.ico} aria-hidden="true"><Link2 size={17} /></span>
            <div>
              <h2 id="sh-build" className={dt.cardTitle}>Build your link</h2>
              <p className={dt.cardSub}>Pick a period, check the preview, then generate.</p>
            </div>
          </div>

          <div className={dt.step}>
            <span className={dt.stepNum}>1</span>
            <div className={dt.stepBody}>
              <span className={dt.label} id="sh-range">Time range</span>
              <div className={dt.chips} role="radiogroup" aria-labelledby="sh-range">
                {RANGES.map((r) => (
                  <button key={r.id} type="button" role="radio" aria-checked={range === r.id} onClick={() => { setRange(r.id); setShortUrl(""); setFullUrl(""); }}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={dt.step}>
            <span className={dt.stepNum}>2</span>
            <div className={dt.stepBody}>
              <span className={dt.label}>What viewers will see</span>
              <ul className={dt.checks}>
                <li><Check size={13} aria-hidden="true" /> {stats.total} closed trades: symbol, side, entry, exit and P&amp;L</li>
                <li><Check size={13} aria-hidden="true" /> Win rate, net P&amp;L and your equity curve</li>
                <li className={dt.off}><EyeOff size={13} aria-hidden="true" /> Not shared: your email, notes, screenshots or account</li>
              </ul>
            </div>
          </div>

          <div className={dt.step}>
            <span className={dt.stepNum}>3</span>
            <div className={dt.stepBody}>
              {!link ? (
                <button type="button" className={`${ov.btn} ${ov.gold}`} onClick={generate} disabled={busy || !filtered.length} style={{ alignSelf: "flex-start" }}>
                  {busy ? <><Spinner /> Generating…</> : <><Link2 size={15} aria-hidden="true" /> Generate share link</>}
                </button>
              ) : (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={dt.ready}>
                  <span className={dt.readyTag}><Check size={12} aria-hidden="true" /> Link ready</span>
                  <div className={dt.linkRow}>
                    <input readOnly value={link} aria-label="Share link" onFocus={(e) => e.target.select()} />
                    <button type="button" className={`${ov.btn} ${ov.gold}`} onClick={copy}>
                      {copied ? <><Check size={14} aria-hidden="true" /> Copied</> : <><Copy size={14} aria-hidden="true" /> Copy</>}
                    </button>
                  </div>
                  <div className={dt.shareRow}>
                    <button type="button" className={`${ov.btn} ${ov.ghost}`} onClick={() => window.open(link, "_blank", "noopener")}><ExternalLink size={14} aria-hidden="true" /> Open</button>
                    {typeof navigator !== "undefined" && navigator.share && (
                      <button type="button" className={`${ov.btn} ${ov.ghost}`} onClick={nativeShare}><Share2 size={14} aria-hidden="true" /> Share</button>
                    )}
                    <a className={`${ov.btn} ${ov.ghost}`} href={`https://wa.me/?text=${encodeURIComponent(`My trading performance (${rangeLabel}): ${link}`)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                    <a className={`${ov.btn} ${ov.ghost}`} href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`My trading performance (${rangeLabel})`)}&url=${encodeURIComponent(link)}`} target="_blank" rel="noopener noreferrer">X</a>
                    <button type="button" className={`${ov.btn} ${ov.ghost}`} onClick={generate} disabled={busy}><RefreshCw size={14} aria-hidden="true" /> New link</button>
                  </div>
                </motion.div>
              )}
              {!filtered.length && <small className={dt.hint}>No closed trades in this range. Pick a longer one.</small>}
            </div>
          </div>
        </section>

        {/* ---- what the viewer sees ---- */}
        <aside className={dt.side}>
          <section className={dt.card} aria-labelledby="sh-prev">
            <div className={dt.previewHead}>
              <span id="sh-prev" className={dt.label}>Preview</span>
              <span className={dt.previewPill}>Read-only · {rangeLabel}</span>
            </div>
            <div className={dt.preview}>
              <b className={dt.previewName}>{accountName}</b>
              <div className={dt.previewStats}>
                <div><span>Trades</span><b>{stats.total}</b></div>
                <div><span>Win rate</span><b>{stats.winRate}%</b></div>
                <div><span>Net P&amp;L</span><b className={stats.net > 0 ? dt.pos : stats.net < 0 ? dt.neg : undefined}>{money(stats.net, currencySymbol)}</b></div>
                <div><span>Best trade</span><b className={best > 0 ? dt.pos : undefined}>{sorted.length ? money(best, currencySymbol) : "—"}</b></div>
              </div>
              {curve ? (
                <svg viewBox={`0 0 ${curve.W} ${curve.H}`} preserveAspectRatio="none" className={dt.spark} aria-label="Equity curve">
                  <defs>
                    <linearGradient id="sh-g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={curve.up ? "#2ebd85" : "#f6465d"} stopOpacity="0.3" />
                      <stop offset="100%" stopColor={curve.up ? "#2ebd85" : "#f6465d"} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={curve.area} fill="url(#sh-g)" />
                  <path d={curve.d} fill="none" stroke={curve.up ? "#2ebd85" : "#f6465d"} strokeWidth="2" vectorEffect="non-scaling-stroke" />
                </svg>
              ) : <p className={dt.hint}>Not enough trades for a curve yet.</p>}
              {sorted.length > 0 && (
                <ul className={dt.recent}>
                  {sorted.slice(-4).reverse().map((t, i) => (
                    <li key={t._id || i}>
                      <span>{t.symbol} <small>{t.direction}</small></span>
                      <b className={(Number(t.pnl) || 0) >= 0 ? dt.pos : dt.neg}>{money(Number(t.pnl) || 0, currencySymbol)}</b>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className={dt.card}>
            <ul className={dt.privacy}>
              <li><Lock size={14} aria-hidden="true" /><span><b>Read-only snapshot.</b> Viewers can&apos;t edit anything or reach your account.</span></li>
              <li><RefreshCw size={14} aria-hidden="true" /><span><b>Doesn&apos;t update.</b> New trades need a new link.</span></li>
              <li><ShieldCheck size={14} aria-hidden="true" /><span><b>Only what you pick.</b> Trades outside the range aren&apos;t included.</span></li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
