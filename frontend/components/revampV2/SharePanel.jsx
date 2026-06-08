"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, Link2, Share2 } from "lucide-react";
import Badge from "./Badge";
import Button from "./Button";
import Toast from "./Toast";

/**
 * SharePanel — generate a public, read-only link of your trades.
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
      flash("danger", "Could not generate link — try again");
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
      flash("danger", "Copy failed — select the link manually");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", width: "100%" }}>
      <Toast toast={toast} />

      <div>
        <div style={{ font: "var(--text-h2)" }}>Share your logs</div>
        <div style={{ font: "var(--text-body)", color: "var(--color-text-muted)" }}>
          Create a read-only link to your performance — no login needed to view it.
        </div>
      </div>

      <div className="jx-card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <div className="jx-field">
          <span className="jx-sidebar__section" style={{ padding: 0 }}>Time range</span>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            {RANGES.map((r) => (
              <button
                key={r.id}
                className={`jx-chip ${range === r.id ? "jx-chip--selected" : ""}`}
                onClick={() => { setRange(r.id); setShortUrl(""); setFullUrl(""); }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* preview */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "var(--space-3)" }}>
          {[
            ["Journal", accountName],
            ["Trades", stats.total],
            ["Win rate", `${stats.winRate}%`],
            ["Net P&L", money(stats.net, currencySymbol)],
          ].map(([l, v], i) => (
            <div key={l} className="jx-card jx-card--flat" style={{ padding: "var(--space-3) var(--space-4)" }}>
              <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>{l}</span>
              <div style={{ font: "var(--text-title)", color: i === 3 ? (stats.net >= 0 ? "var(--color-success-strong)" : "var(--color-danger-strong)") : undefined }}>
                {v}
              </div>
            </div>
          ))}
        </div>

        <Button variant="primary" onClick={generate} disabled={busy} style={{ alignSelf: "flex-start", minWidth: 170 }}>
          {busy ? <><Spinner /> Generating…</> : <><Link2 size={15} /> Generate share link</>}
        </Button>

        {(shortUrl || fullUrl) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="jx-card jx-card--flat"
            style={{ padding: "var(--space-3) var(--space-4)", display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}
          >
            <Badge variant="success">Ready</Badge>
            <span style={{ flex: 1, font: "var(--text-body-md)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 160 }}>
              {shortUrl || fullUrl}
            </span>
            <Button variant={copied ? "success-subtle" : "outline"} size="sm" icon={copied ? Check : Copy} onClick={copy}>
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => window.open(shortUrl || fullUrl, "_blank")}>
              Preview
            </Button>
          </motion.div>
        )}

        <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
          The link contains a snapshot of the selected trades — it won&apos;t update as you log more, and viewers can&apos;t access your account.
        </span>
      </div>
    </div>
  );
}
