"use client";

/* Public read-only share page — /view-trades?data=<base64>.
   Revamp v2: JournalX branding + CTA, stat tiles, P&L calendar,
   trades table. No auth required. */

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import FullPageLoader from "@/components/ui/FullPageLoader";

const fmt = (v, d = 2) => Number(v).toLocaleString(undefined, { maximumFractionDigits: d });
const money = (v) => {
  const a = Math.abs(v);
  const s = a >= 1000 ? `$${fmt(a / 1000, 2)}k` : `$${fmt(a)}`;
  return `${v < 0 ? "−" : "+"}${s}`;
};

function Brand() {
  return (
    <span style={{ font: "var(--text-title)", display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 26, height: 26, borderRadius: 8, background: "var(--color-primary)" }} />
      Journal<strong style={{ color: "var(--yellow-500)" }}>X</strong>
    </span>
  );
}

function Calendar({ trades }) {
  const latest = trades.length
    ? new Date(Math.max(...trades.map((t) => new Date(t.closeTime).getTime())))
    : new Date();
  const [month, setMonth] = useState(new Date(latest.getFullYear(), latest.getMonth(), 1));
  const byDay = useMemo(() => {
    const m = {};
    trades.forEach((t) => {
      const d = new Date(t.closeTime);
      if (d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth()) {
        const k = d.getDate();
        m[k] = m[k] || { pnl: 0, n: 0 };
        m[k].pnl += Number(t.pnl) || 0;
        m[k].n += 1;
      }
    });
    return m;
  }, [trades, month]);
  const firstDow = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return (
    <div className="jx-card">
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
        <span className="jx-card__title">{month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</span>
        <button className="jx-btn jx-btn--ghost jx-btn--sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous"><ChevronLeft size={15} /></button>
        <button className="jx-btn jx-btn--ghost jx-btn--sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next"><ChevronRight size={15} /></button>
        <span style={{ marginLeft: "auto", font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
          <span style={{ color: "var(--color-success)" }}>● Profit</span>{" "}
          <span style={{ color: "var(--color-danger)" }}>● Loss</span>
        </span>
      </div>
      <div className="jx-cal">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <span key={d} className="jx-cal__head">{d}</span>
        ))}
        {[...Array(firstDow)].map((_, i) => (<span key={`e${i}`} />))}
        {[...Array(days)].map((_, i) => {
          const d = byDay[i + 1];
          return (
            <div key={i} className={`jx-cal__cell ${d ? (d.pnl >= 0 ? "jx-cal__cell--win" : "jx-cal__cell--loss") : ""}`}>
              <span>{i + 1}</span>
              {d && <span className={d.pnl >= 0 ? "jx-cal__pnl--win" : "jx-cal__pnl--loss"}>{money(d.pnl)}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ViewTrades() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const raw = params.get("data");
      if (!raw) {
        setError("This link is missing its data.");
      } else {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(raw))));
        setData(decoded);
      }
    } catch (e) {
      console.error(e);
      setError("This share link looks broken or expired.");
    } finally {
      setLoading(false);
    }
  }, []);

  const trades = useMemo(
    () => (data?.trades || []).filter((t) => t.closeTime).sort((a, b) => new Date(b.closeTime) - new Date(a.closeTime)),
    [data],
  );

  const stats = useMemo(() => {
    const total = trades.length;
    const wins = trades.filter((t) => t.pnl > 0).length;
    const net = trades.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
    const best = total ? Math.max(...trades.map((t) => Number(t.pnl) || 0)) : 0;
    return { total, wins, losses: total - wins, winRate: total ? ((wins / total) * 100).toFixed(1) : "0", net, best };
  }, [trades]);

  if (loading) return <FullPageLoader label="Opening shared journal…" />;

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg-canvas)", fontFamily: "var(--jx-font)", color: "var(--color-text-primary)" }}>
      {/* header */}
      <header style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-4) var(--space-6)", borderBottom: "1px solid var(--color-border)", background: "var(--color-bg-surface)", position: "sticky", top: 0, zIndex: 10 }}>
        <a href="https://journalx.app" style={{ textDecoration: "none", color: "inherit" }}><Brand /></a>
        <span className="jx-badge jx-badge--brand" style={{ marginLeft: 4 }}>Shared journal</span>
        <a href="https://journalx.app/register" style={{ marginLeft: "auto", textDecoration: "none" }}>
          <button className="jx-btn jx-btn--primary jx-btn--sm">
            Start your journal <ArrowRight size={14} />
          </button>
        </a>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "var(--space-8) var(--space-4) 120px", display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        {error ? (
          <div className="jx-card" style={{ textAlign: "center", padding: "var(--space-10)" }}>
            <div style={{ font: "var(--text-h3)" }}>{error}</div>
            <p style={{ color: "var(--color-text-muted)", font: "var(--text-body)" }}>
              Ask for a fresh link, or start tracking your own trades free.
            </p>
            <a href="https://journalx.app" style={{ textDecoration: "none" }}>
              <button className="jx-btn jx-btn--primary">Go to JournalX</button>
            </a>
          </div>
        ) : (
          <>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div style={{ font: "var(--text-h1)" }}>{data?.meta?.account || "Shared journal"}</div>
              <div style={{ font: "var(--text-body)", color: "var(--color-text-muted)" }}>
                {data?.meta?.timeRange || "Performance snapshot"} · shared{" "}
                {data?.meta?.generatedAt && new Date(data.meta.generatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
              </div>
            </motion.div>

            {/* stat tiles */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--space-4)" }}>
              {[
                ["Net P&L", money(stats.net), stats.net >= 0 ? "var(--color-success-strong)" : "var(--color-danger-strong)"],
                ["Trades", stats.total],
                ["Win rate", `${stats.winRate}%`],
                ["Best trade", money(stats.best), "var(--color-success-strong)"],
              ].map(([l, v, c]) => (
                <div key={l} className="jx-card" style={{ padding: "var(--space-4) var(--space-5)" }}>
                  <span style={{ font: "var(--text-label)", letterSpacing: ".6px", textTransform: "uppercase", color: "var(--color-text-muted)" }}>{l}</span>
                  <div style={{ font: "var(--text-stat)", letterSpacing: "-1px", color: c || "var(--color-text-primary)" }}>{v}</div>
                </div>
              ))}
            </div>

            <Calendar trades={trades} />

            {/* trades table */}
            <div className="jx-card" style={{ padding: 0, overflowX: "auto" }}>
              <table className="jx-table">
                <thead>
                  <tr>
                    <th>Pair</th><th>Side</th><th>Entry</th><th>Exit</th><th>P&L</th><th>R : R</th><th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((t, i) => {
                    const isLong = t.direction?.toLowerCase() === "long";
                    const pnl = Number(t.pnl) || 0;
                    return (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{t.symbol || "—"}</td>
                        <td>
                          <span className={`jx-badge ${isLong ? "jx-badge--success" : "jx-badge--danger"}`}>
                            {isLong ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                            {isLong ? "Long" : "Short"}
                          </span>
                        </td>
                        <td>{t.avgEntryPrice ? `$${fmt(t.avgEntryPrice)}` : "—"}</td>
                        <td>{t.avgExitPrice ? `$${fmt(t.avgExitPrice)}` : "—"}</td>
                        <td style={{ fontWeight: 600, color: pnl >= 0 ? "var(--color-success-strong)" : "var(--color-danger-strong)" }}>{money(pnl)}</td>
                        <td>{t.rr || "—"}</td>
                        <td style={{ color: "var(--color-text-muted)" }}>
                          {new Date(t.closeTime).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* bottom CTA */}
            <div className="jx-card" style={{ textAlign: "center", padding: "var(--space-8)", background: "var(--color-primary-subtle)", border: "1px solid var(--color-primary)" }}>
              <div style={{ font: "var(--text-h2)" }}>Track your edge like this trader</div>
              <p style={{ font: "var(--text-body)", color: "var(--color-text-secondary)", maxWidth: 480, margin: "var(--space-2) auto var(--space-4)" }}>
                JournalX logs your trades, scores your discipline, and shows you exactly where your P&L comes from.
              </p>
              <a href="https://journalx.app/register" style={{ textDecoration: "none" }}>
                <button className="jx-btn jx-btn--primary jx-btn--lg">
                  Start journaling free <ArrowRight size={16} />
                </button>
              </a>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
