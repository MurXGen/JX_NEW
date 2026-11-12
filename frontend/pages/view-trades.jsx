"use client";

/* Public read-only share page, /view-trades?data=<base64>.
   Revamp v2: JournalX branding + CTA, stat tiles, P&L calendar,
   trades table. No auth required. */

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Lock,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import FullPageLoader from "@/components/ui/FullPageLoader";
import sv from "@/components/app/SharedView.module.css";

const fmt = (v, d = 2) => Number(v).toLocaleString(undefined, { maximumFractionDigits: d });
const money = (v) => {
  const a = Math.abs(v);
  const s = a >= 1000 ? `$${fmt(a / 1000, 2)}k` : `$${fmt(a)}`;
  return `${v < 0 ? "−" : v > 0 ? "+" : ""}${s}`;
};
const tone = (v) => (v > 0 ? sv.pos : v < 0 ? sv.neg : undefined);

function Wordmark() {
  return <span className={sv.word}>Journal<em>X</em></span>;
}

function Equity({ trades }) {
  const asc = [...trades].reverse();
  let c = 0;
  const pts = asc.map((t) => (c += Number(t.pnl) || 0));
  if (pts.length < 2) return <p className={sv.muted}>Not enough trades to draw a curve.</p>;
  const W = 800, H = 200;
  const lo = Math.min(0, ...pts), hi = Math.max(0, ...pts);
  const x = (i) => (i / (pts.length - 1)) * W;
  const y = (v) => 10 + (1 - (v - lo) / (hi - lo || 1)) * (H - 20);
  const d = pts.map((v, i) => `${i ? "L" : "M"} ${x(i)} ${y(v)}`).join(" ");
  const up = pts[pts.length - 1] >= 0;
  const col = up ? "#2ebd85" : "#f6465d";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={sv.equity} role="img" aria-label={`Equity curve ending at ${money(pts[pts.length - 1])}`}>
      <defs>
        <linearGradient id="sv-eq" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={col} stopOpacity="0.28" />
          <stop offset="100%" stopColor={col} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" x2={W} y1={y(0)} y2={y(0)} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 6" vectorEffect="non-scaling-stroke" />
      <path d={`${d} L ${W} ${H} L 0 ${H} Z`} fill="url(#sv-eq)" />
      <path d={d} fill="none" stroke={col} strokeWidth="2.2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function BySymbol({ trades }) {
  const rows = useMemo(() => {
    const m = new Map();
    trades.forEach((t) => {
      const k = t.symbol || "—";
      const e = m.get(k) || { net: 0, n: 0, w: 0 };
      e.net += Number(t.pnl) || 0; e.n += 1; if ((Number(t.pnl) || 0) > 0) e.w += 1;
      m.set(k, e);
    });
    return [...m.entries()].sort((a, b) => b[1].net - a[1].net).slice(0, 6);
  }, [trades]);
  const max = Math.max(1, ...rows.map(([, e]) => Math.abs(e.net)));
  return (
    <div className={sv.bars}>
      {rows.map(([k, e]) => (
        <div key={k} className={sv.barRow}>
          <span className={sv.barLbl}>{k}<small>{e.n} trades · {Math.round((e.w / e.n) * 100)}%</small></span>
          <span className={sv.track} aria-hidden="true">
            <i style={e.net >= 0 ? { left: "50%", width: `${(e.net / max) * 50}%`, background: "#2ebd85" } : { right: "50%", width: `${(-e.net / max) * 50}%`, background: "#f6465d" }} />
          </span>
          <b className={tone(e.net)}>{money(e.net)}</b>
        </div>
      ))}
    </div>
  );
}

function Calendar({ trades }) {
  const months = useMemo(() => {
    const set = new Set(trades.map((t) => { const d = new Date(t.closeTime); return d.getFullYear() * 12 + d.getMonth(); }));
    return [...set].sort((a, b) => a - b);
  }, [trades]);
  const [idx, setIdx] = useState(Math.max(0, months.length - 1));
  const key = months[idx] ?? (new Date().getFullYear() * 12 + new Date().getMonth());
  const month = new Date(Math.floor(key / 12), key % 12, 1);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trades, key]);
  const monthNet = Object.values(byDay).reduce((a, d) => a + d.pnl, 0);
  const firstDow = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return (
    <section className={sv.card} aria-labelledby="sv-cal">
      <div className={sv.cardHead}>
        <div>
          <h2 id="sv-cal" className={sv.cardTitle}>{month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</h2>
          <p className={sv.cardSub}>Month P&amp;L <b className={tone(monthNet)}>{money(monthNet)}</b></p>
        </div>
        <div className={sv.nav}>
          <button type="button" onClick={() => setIdx((i) => i - 1)} disabled={idx <= 0} aria-label="Previous month"><ChevronLeft size={15} /></button>
          <button type="button" onClick={() => setIdx((i) => i + 1)} disabled={idx >= months.length - 1} aria-label="Next month"><ChevronRight size={15} /></button>
        </div>
      </div>
      <div className={sv.cal}>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <span key={d} className={sv.dow}>{d}</span>)}
        {[...Array(firstDow)].map((_, i) => <span key={`e${i}`} />)}
        {[...Array(days)].map((_, i) => {
          const d = byDay[i + 1];
          return (
            <div key={i} className={sv.day} data-tone={d ? (d.pnl >= 0 ? "up" : "down") : undefined} aria-label={d ? `${i + 1}: ${money(d.pnl)}, ${d.n} trades` : `${i + 1}: no trades`}>
              <span>{i + 1}</span>
              {d && <><b>{money(d.pnl)}</b><small>{d.n} trade{d.n === 1 ? "" : "s"}</small></>}
            </div>
          );
        })}
      </div>
    </section>
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

  const has = (k) => trades.some((t) => t[k] != null && t[k] !== "" && Number(t[k]) !== 0);
  const showEntry = has("avgEntryPrice"), showExit = has("avgExitPrice"), showRR = has("rr");
  const worst = trades.length ? Math.min(...trades.map((t) => Number(t.pnl) || 0)) : 0;
  const grossW = trades.filter((t) => t.pnl > 0).reduce((a, t) => a + Number(t.pnl), 0);
  const grossL = Math.abs(trades.filter((t) => t.pnl < 0).reduce((a, t) => a + Number(t.pnl), 0));
  const pf = grossL ? grossW / grossL : null;
  const shared = data?.meta?.generatedAt && new Date(data.meta.generatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className={sv.page}>
      <header className={sv.top}>
        <a href="https://journalx.app" className={sv.brand} aria-label="JournalX home"><Wordmark /></a>
        <span className={sv.badge}><Lock size={12} aria-hidden="true" /> Read-only snapshot</span>
        <a href="https://journalx.app/register" className={sv.cta}>Start your journal <ArrowRight size={14} aria-hidden="true" /></a>
      </header>

      <main className={sv.main}>
        {error ? (
          <section className={`${sv.card} ${sv.error}`}>
            <h1>{error}</h1>
            <p>Ask for a fresh link, or start tracking your own trades for free.</p>
            <a href="https://journalx.app" className={sv.cta}>Go to JournalX <ArrowRight size={14} aria-hidden="true" /></a>
          </section>
        ) : (
          <>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={sv.hero}>
              <span className={sv.kicker}>Shared trading journal</span>
              <h1>{data?.meta?.account || "Shared journal"}</h1>
              <p><CalendarDays size={14} aria-hidden="true" /> {data?.meta?.timeRange || "Performance snapshot"}{shared ? <> · shared {shared}</> : null} · {stats.total} closed trades</p>
            </motion.div>

            <div className={sv.stats}>
              <div><span>Net P&amp;L</span><b className={tone(stats.net)}>{money(stats.net)}</b></div>
              <div><span>Win rate</span><b>{stats.winRate}%</b><small>{stats.wins} wins · {stats.losses} losses</small></div>
              <div><span>Profit factor</span><b>{pf ? fmt(pf, 2) : "—"}</b><small>Gross profit ÷ gross loss</small></div>
              <div><span>Best trade</span><b className={tone(stats.best)}>{money(stats.best)}</b><small>Worst {money(worst)}</small></div>
            </div>

            <div className={sv.grid2}>
              <section className={sv.card} aria-labelledby="sv-eq-t">
                <div className={sv.cardHead}>
                  <div>
                    <h2 id="sv-eq-t" className={sv.cardTitle}>Equity curve</h2>
                    <p className={sv.cardSub}>Cumulative P&amp;L, trade by trade</p>
                  </div>
                  <b className={`${sv.big} ${tone(stats.net) || ""}`}>{money(stats.net)}</b>
                </div>
                <Equity trades={trades} />
              </section>
              <section className={sv.card} aria-labelledby="sv-sym">
                <div className={sv.cardHead}>
                  <div>
                    <h2 id="sv-sym" className={sv.cardTitle}>P&amp;L by symbol</h2>
                    <p className={sv.cardSub}>Where the results came from</p>
                  </div>
                </div>
                <BySymbol trades={trades} />
              </section>
            </div>

            <Calendar trades={trades} />

            <section className={sv.card} aria-labelledby="sv-trades">
              <div className={sv.cardHead}>
                <div>
                  <h2 id="sv-trades" className={sv.cardTitle}>Trades</h2>
                  <p className={sv.cardSub}>Newest first</p>
                </div>
              </div>
              <div className={sv.tableWrap}>
                <table className={sv.table}>
                  <thead>
                    <tr>
                      <th>Symbol</th><th>Side</th>
                      {showEntry && <th className={sv.num}>Entry</th>}
                      {showExit && <th className={sv.num}>Exit</th>}
                      {showRR && <th className={sv.num}>R : R</th>}
                      <th className={sv.num}>P&amp;L</th><th className={sv.num}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((t, i) => {
                      const isLong = t.direction?.toLowerCase() === "long";
                      const pnl = Number(t.pnl) || 0;
                      return (
                        <tr key={i}>
                          <td className={sv.sym}>{t.symbol || "—"}</td>
                          <td><span className={sv.side}>{isLong ? <TrendingUp size={12} aria-hidden="true" /> : <TrendingDown size={12} aria-hidden="true" />}{isLong ? "Long" : "Short"}</span></td>
                          {showEntry && <td className={sv.num}>{t.avgEntryPrice ? `$${fmt(t.avgEntryPrice)}` : "—"}</td>}
                          {showExit && <td className={sv.num}>{t.avgExitPrice ? `$${fmt(t.avgExitPrice)}` : "—"}</td>}
                          {showRR && <td className={sv.num}>{t.rr || "—"}</td>}
                          <td className={`${sv.num} ${sv.pnl} ${tone(pnl) || ""}`}>{money(pnl)}</td>
                          <td className={`${sv.num} ${sv.date}`}>{new Date(t.closeTime).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={sv.ctaCard}>
              <h2>Track your edge like this trader</h2>
              <p>JournalX logs every trade, for personal and funded accounts, and shows exactly where your P&amp;L comes from.</p>
              <a href="https://journalx.app/register" className={sv.cta}>Start journaling free <ArrowRight size={15} aria-hidden="true" /></a>
              <small>Shared as a read-only snapshot. The owner&apos;s account and notes aren&apos;t visible.</small>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
