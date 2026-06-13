"use client";

/* JournalX landing — v3 premium glassmorphic redesign.
   Self-contained marketing page on a dark aurora-gradient canvas:
   glass nav → hero (floating candles + signature "live journal" mock) →
   social proof → how it works → features → analytics showcase (recharts) →
   why JournalX → interactive demo → testimonials → pricing → blog → FAQ → CTA.
   Full SEO (meta, OG, Twitter, Organization / SoftwareApplication / FAQPage /
   WebSite JSON-LD). Respects prefers-reduced-motion; responsive throughout. */

import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  Activity,
  ArrowRight,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  BrainCircuit,
  CalendarDays,
  Check,
  Crown,
  Flame,
  LineChart as LineChartIcon,
  Percent,
  PieChart as PieChartIcon,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import FullPageLoader from "@/components/ui/FullPageLoader";
import { createPortal } from "react-dom";
import { LandingNav, LandingFooter, btnPrimary, btnGhost } from "@/components/landingPage/LandingChrome";
import { getAllPosts, fmtDate } from "@/utils/blogs";
import PaddleLoader from "@/components/payments/PaddleLoader";
import PaymentModal from "@/components/payments/PaymentModal";
import { usePlanCheckout } from "@/components/payments/usePlanCheckout";
import {
  PLANS_FEATURES,
  PLANS_CONFIG,
  buildPlansConfig,
  getUserCurrency,
  detectCurrencyByIP,
} from "@/utils/plans";

const SITE_URL = "https://journalx.app";
const TITLE = "JournalX — Trading Journal & Trade Analytics App";
const DESC =
  "The trading journal that analyzes your trades in under 10 seconds. Track win rate, risk & psychology across stocks, forex, futures & crypto. Start free — no card.";

const C = {
  text: "#fff",
  muted: "#aeb4bc",
  dim: "#707a8a",
  canvas: "#0d1117",
  surface: "#161a20",
  border: "rgba(255,255,255,0.1)",
  yellow: "#fcd535",
  yellowDeep: "#f0b90b",
  green: "#2ebd85",
  red: "#f6465d",
};

/* Shared glassmorphic surface */
const glass = {
  background: "rgba(22,26,32,0.55)",
  border: `1px solid ${C.border}`,
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.28)",
};
const glassDeep = {
  background: "rgba(13,17,23,0.6)",
  border: "1px solid rgba(255,255,255,0.08)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
};

/* ===== Aurora gradient backdrop =====
   Low-alpha yellow/green/red blobs drifting slowly behind the whole page.
   Transform-only animation (cheap); static when reduced motion is on. */
const AURORA = [
  { top: -220, left: -140, size: 620, color: "rgba(252,213,53,0.13)", dur: 19, dx: 70, dy: 50 },
  { top: "26%", right: -240, size: 680, color: "rgba(46,189,133,0.11)", dur: 24, dx: -60, dy: 70 },
  { top: "58%", left: -200, size: 560, color: "rgba(246,70,93,0.085)", dur: 28, dx: 80, dy: -60 },
  { bottom: -260, right: "8%", size: 640, color: "rgba(240,185,11,0.09)", dur: 23, dx: -70, dy: -50 },
];

function AuroraBackdrop() {
  const reduced = useReducedMotion();
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      {AURORA.map((b, i) => (
        <motion.div
          key={i}
          animate={reduced ? undefined : { x: [0, b.dx, 0], y: [0, b.dy, 0] }}
          transition={{ duration: b.dur, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            top: b.top,
            left: b.left,
            right: b.right,
            bottom: b.bottom,
            width: b.size,
            height: b.size,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${b.color} 0%, transparent 68%)`,
            filter: "blur(60px)",
            willChange: "transform",
          }}
        />
      ))}
    </div>
  );
}

/* ===== Floating hero candles (kept from v2, enhanced glow) ===== */
function Candle({ color, w = 16, wickTop = 18, bodyH = 46, wickBottom = 18 }) {
  const h = wickTop + bodyH + wickBottom;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" aria-hidden="true">
      <line x1={w / 2} y1="0" x2={w / 2} y2={h} stroke={color} strokeWidth="2" strokeLinecap="round" />
      <rect x="1" y={wickTop} width={w - 2} height={bodyH} rx="3" fill={color} />
    </svg>
  );
}

const CANDLES = [
  { left: "5%", top: "10%", color: C.green, w: 16, bodyH: 54, scale: 1.1, delay: 0, dur: 7, amp: 18 },
  { left: "14%", top: "56%", color: C.red, w: 14, bodyH: 40, scale: 0.9, delay: 1.2, dur: 8, amp: 24 },
  { left: "28%", top: "24%", color: C.green, w: 12, bodyH: 32, scale: 0.8, delay: 0.6, dur: 9, amp: 14 },
  { left: "74%", top: "12%", color: C.green, w: 18, bodyH: 60, scale: 1.2, delay: 0.3, dur: 7.5, amp: 20 },
  { left: "86%", top: "44%", color: C.red, w: 15, bodyH: 44, scale: 1.0, delay: 1.6, dur: 8.5, amp: 26 },
  { left: "62%", top: "64%", color: C.red, w: 12, bodyH: 30, scale: 0.75, delay: 2.0, dur: 9.5, amp: 16 },
  { left: "44%", top: "6%", color: C.green, w: 13, bodyH: 36, scale: 0.85, delay: 0.9, dur: 8, amp: 18 },
];

function HeroBackdrop() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  return (
    <div ref={ref} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
      <FloatingCandles progress={scrollYProgress} />
    </div>
  );
}

function FloatingCandles({ progress }) {
  const reduced = useReducedMotion();
  const y = useTransform(progress, [0, 1], [0, -90]);
  const opacity = useTransform(progress, [0, 0.85], [1, 0]);
  return (
    <motion.div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", y, opacity, zIndex: 0 }}>
      {CANDLES.map((c, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={reduced ? { opacity: 0.12 } : { opacity: 0.12, y: [0, -c.amp, 0] }}
          transition={{
            opacity: { duration: 1.2, delay: c.delay },
            y: { duration: c.dur, delay: c.delay, repeat: Infinity, ease: "easeInOut" },
          }}
          style={{
            position: "absolute",
            left: c.left,
            top: c.top,
            transform: `scale(${c.scale})`,
            filter: `blur(0.4px) drop-shadow(0 0 14px ${c.color}44)`,
          }}
        >
          <Candle color={c.color} w={c.w} bodyH={c.bodyH} />
        </motion.div>
      ))}
    </motion.div>
  );
}

/* ===== Signature animation: the live JournalX mock =====
   A glass replica of the app where a journal is created, the trade form
   fills itself in (symbol types out, side & P&L pop in), the Add button
   presses, and rows slide into the journal table one by one while the
   stats and equity bars tick up. Loops forever; static when the visitor
   prefers reduced motion. */
const MOCK_TRADES = [
  { sym: "BTCUSDT", side: "Long", pnl: 420, r: "2.1R" },
  { sym: "EURUSD", side: "Short", pnl: -130, r: "-1.0R" },
  { sym: "AAPL", side: "Long", pnl: 260, r: "1.6R" },
  { sym: "NQ", side: "Short", pnl: 310, r: "1.8R" },
  { sym: "ETHUSDT", side: "Long", pnl: -90, r: "-0.6R" },
  { sym: "TSLA", side: "Long", pnl: 510, r: "2.4R" },
];

const fmtPnl = (n) => `${n < 0 ? "−" : "+"}$${Math.abs(n).toLocaleString()}`;

function MockField({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
      <span style={{ font: "400 10px Poppins", color: C.dim, letterSpacing: 0.4, textTransform: "uppercase" }}>{label}</span>
      <div style={{ ...glassDeep, borderRadius: 9, padding: "9px 11px", font: "600 13px Poppins", minHeight: 36, display: "flex", alignItems: "center", overflow: "hidden", whiteSpace: "nowrap" }}>
        {children}
      </div>
    </div>
  );
}

function MockStat({ label, value, color }) {
  return (
    <div style={{ ...glassDeep, borderRadius: 10, padding: "9px 11px", minWidth: 0 }}>
      <div style={{ font: "400 10px Poppins", color: C.dim, marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={String(value)}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{ font: "700 16px Poppins", letterSpacing: "-0.5px", color, whiteSpace: "nowrap" }}
        >
          {value}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function JournalMock() {
  const reduced = useReducedMotion();
  // count = number of rows currently inserted (0..len); loops back to 0
  const [count, setCount] = useState(reduced ? MOCK_TRADES.length : 0);

  useEffect(() => {
    if (reduced) {
      setCount(MOCK_TRADES.length);
      return;
    }
    let alive = true;
    let timer;
    const step = () => {
      if (!alive) return;
      setCount((c) => (c >= MOCK_TRADES.length ? 0 : c + 1));
      timer = setTimeout(step, 2400);
    };
    timer = setTimeout(step, 1700);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [reduced]);

  const inserted = MOCK_TRADES.slice(0, count);
  const next = MOCK_TRADES[count % MOCK_TRADES.length];
  const total = inserted.reduce((s, t) => s + t.pnl, 0);
  const wins = inserted.filter((t) => t.pnl > 0).length;
  const winRate = inserted.length ? Math.round((wins / inserted.length) * 100) : 0;
  let cum = 0;
  const equity = inserted.map((t) => (cum += t.pnl));
  const maxAbs = Math.max(1, ...equity.map((e) => Math.abs(e)));

  return (
    <div
      role="img"
      aria-label="Animated preview of the JournalX app: a trade entry form fills itself in and trades appear in a journal table while statistics update"
      style={{ ...glass, borderRadius: 22, overflow: "hidden", textAlign: "left", position: "relative" }}
    >
      {/* subtle top gradient sheen */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(252,213,53,0.06) 0%, transparent 32%)", pointerEvents: "none" }} />

      {/* window chrome */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
        <span style={{ display: "flex", gap: 6 }} aria-hidden="true">
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: C.red, opacity: 0.85 }} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: C.yellow, opacity: 0.85 }} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: C.green, opacity: 0.85 }} />
        </span>
        <span style={{ font: "600 12px Poppins", color: C.muted, display: "flex", alignItems: "center", gap: 7 }}>
          Journal<span style={{ color: C.yellow, marginLeft: -6 }}>X</span> · My Futures Journal
        </span>
        {/* journal-created toast */}
        <span style={{ marginLeft: "auto", minHeight: 22 }}>
          <AnimatePresence mode="wait">
            {!reduced && count === 0 && (
              <motion.span key="creating" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} style={{ display: "inline-flex", alignItems: "center", gap: 5, font: "600 11px Poppins", color: C.yellow, background: "rgba(252,213,53,0.1)", border: "1px solid rgba(252,213,53,0.25)", borderRadius: 999, padding: "3px 10px" }}>
                <Sparkles size={11} /> Creating journal…
              </motion.span>
            )}
            {(reduced || count > 0) && (
              <motion.span key="created" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} style={{ display: "inline-flex", alignItems: "center", gap: 5, font: "600 11px Poppins", color: C.green, background: "rgba(46,189,133,0.1)", border: "1px solid rgba(46,189,133,0.25)", borderRadius: 999, padding: "3px 10px" }}>
                <Check size={11} /> Journal created
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </div>

      <div className="lp-mock-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0,0.9fr) minmax(0,1.35fr)", gap: 14, padding: 16 }}>
        {/* left: self-filling trade form */}
        <div style={{ ...glassDeep, borderRadius: 14, padding: 14, display: "flex", flexDirection: "column", gap: 11 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, font: "600 13px Poppins" }}>
            <Plus size={14} style={{ color: C.yellow }} /> New trade
          </div>
          {/* keyed by count so the fields replay for every trade */}
          <div key={reduced ? "static" : count} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <MockField label="Symbol">
              <span style={{ color: C.text }}>
                {next.sym.split("").map((ch, i) => (
                  <motion.span key={i} initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 + i * 0.07, duration: 0.12 }}>
                    {ch}
                  </motion.span>
                ))}
              </span>
              {!reduced && (
                <motion.span aria-hidden="true" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.9, repeat: Infinity }} style={{ width: 1.5, height: 14, background: C.yellow, marginLeft: 2, display: "inline-block" }} />
              )}
            </MockField>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <MockField label="Side">
                <motion.span
                  initial={reduced ? false : { opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.0, type: "spring", stiffness: 300, damping: 18 }}
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, font: "700 11px Poppins", color: next.side === "Long" ? C.green : C.red, background: next.side === "Long" ? "rgba(46,189,133,0.14)" : "rgba(246,70,93,0.14)", borderRadius: 6, padding: "3px 8px" }}
                >
                  {next.side === "Long" ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />} {next.side.toUpperCase()}
                </motion.span>
              </MockField>
              <MockField label="P&L">
                <motion.span initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3, duration: 0.3 }} style={{ color: next.pnl >= 0 ? C.green : C.red }}>
                  {fmtPnl(next.pnl)}
                </motion.span>
              </MockField>
            </div>
            <motion.div
              aria-hidden="true"
              animate={reduced ? undefined : { scale: [1, 1, 0.95, 1] }}
              transition={{ delay: 1.7, duration: 0.45, times: [0, 0.4, 0.6, 1] }}
              style={{ ...btnPrimary, justifyContent: "center", padding: "10px 14px", fontSize: 13, borderRadius: 10, marginTop: 2 }}
            >
              <Plus size={14} /> Add trade
            </motion.div>
          </div>
        </div>

        {/* right: journal table + live stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
          <div className="lp-mock-stats" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8 }}>
            <MockStat label="Net P&L" value={fmtPnl(total)} color={total >= 0 ? C.green : C.red} />
            <MockStat label="Win rate" value={`${winRate}%`} color={C.yellow} />
            <MockStat label="Trades" value={count} color={C.text} />
          </div>

          {/* journal table */}
          <div style={{ ...glassDeep, borderRadius: 12, padding: "10px 12px", flex: 1, minHeight: 198, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.9fr 1fr 0.7fr", gap: 8, font: "600 10px Poppins", color: C.dim, letterSpacing: 0.5, textTransform: "uppercase", padding: "2px 4px 8px", borderBottom: `1px solid ${C.border}` }}>
              <span>Symbol</span><span>Side</span><span style={{ textAlign: "right" }}>P&L</span><span style={{ textAlign: "right" }}>R</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", marginTop: 4 }}>
              <AnimatePresence initial={false}>
                {[...inserted].reverse().map((t) => (
                  <motion.div
                    key={t.sym}
                    layout
                    initial={{ opacity: 0, x: -22, height: 0 }}
                    animate={{ opacity: 1, x: 0, height: "auto" }}
                    exit={{ opacity: 0, x: 14, height: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    style={{ overflow: "hidden" }}
                  >
                    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.9fr 1fr 0.7fr", gap: 8, alignItems: "center", padding: "7px 4px", font: "500 12px Poppins", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <span style={{ color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.sym}</span>
                      <span style={{ color: t.side === "Long" ? C.green : C.red, font: "600 11px Poppins" }}>{t.side}</span>
                      <span style={{ textAlign: "right", color: t.pnl >= 0 ? C.green : C.red, font: "600 12px Poppins" }}>{fmtPnl(t.pnl)}</span>
                      <span style={{ textAlign: "right", color: C.muted }}>{t.r}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {inserted.length === 0 && (
                <div style={{ font: "400 12px Poppins", color: C.dim, padding: "18px 4px", textAlign: "center" }}>Waiting for your first trade…</div>
              )}
            </div>
          </div>

          {/* mini equity bars */}
          <div style={{ ...glassDeep, borderRadius: 12, padding: "10px 12px" }}>
            <div style={{ font: "400 10px Poppins", color: C.dim, marginBottom: 7, letterSpacing: 0.4, textTransform: "uppercase" }}>Equity</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 44 }}>
              <AnimatePresence initial={false}>
                {equity.map((e, i) => (
                  <motion.div
                    key={i}
                    layout
                    initial={{ opacity: 0, scaleY: 0.15 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    style={{ flex: 1, minWidth: 0, height: Math.max(5, Math.round((Math.abs(e) / maxAbs) * 40)), transformOrigin: "bottom", borderRadius: 4, background: e >= 0 ? C.green : C.red, boxShadow: `0 0 10px ${e >= 0 ? "rgba(46,189,133,0.35)" : "rgba(246,70,93,0.35)"}` }}
                  />
                ))}
              </AnimatePresence>
              {equity.length === 0 && <div style={{ flex: 1, height: 5, borderRadius: 4, background: "rgba(255,255,255,0.06)" }} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== Section copy ===== */
const FEATURES = [
  { icon: Zap, title: "Log trades in seconds", body: "Quick log for P&L-only, or full detail with entries, risk, screenshots and emotions. Connect an exchange and trades import automatically." },
  { icon: BarChart3, title: "Analytics that find your edge", body: "Equity growth candles, P&L calendars, R-multiples, win rate trends, and per-strategy breakdowns — all computed from your real trades." },
  { icon: BrainCircuit, title: "Master your psychology", body: "Tag emotion and discipline on every trade. See exactly how much tilt and FOMO cost you, and where your real edge comes from." },
  { icon: ShieldCheck, title: "Risk, measured", body: "Fixed-risk position sizing, planned vs realised R:R, and profit factor — the metrics that actually keep accounts alive." },
  { icon: CalendarDays, title: "See every day at a glance", body: "A colour-coded P&L calendar and activity heatmap make your consistency (or lack of it) impossible to ignore." },
  { icon: LineChartIcon, title: "Live market context", body: "Ticker tape, heatmaps, economic calendar and news — plus an 'if you'd held' live price check on closed trades." },
];

const WHY = [
  ["Log a trade in 10 seconds", "Spreadsheets take minutes per trade — so you quit"],
  ["Discipline scored at entry", "Generic journals only record numbers after the fact"],
  ["Emotion & mistake analytics", "Broker statements have none of this"],
  ["Equity growth candlesticks", "Most tools show a flat P&L line"],
  ["Auto-import from exchanges", "Manual CSV wrangling everywhere else"],
  ["Free to start, no card", "Many competitors gate everything behind a paywall"],
];

const STEPS = [
  { n: "01", title: "Log or import", body: "Quick log, detailed log, CSV import, or auto-sync from your exchange." },
  { n: "02", title: "Review the analytics", body: "Your dashboard turns trades into equity growth, R-multiples and behavioural insights." },
  { n: "03", title: "Fix one leak at a time", body: "Spot your most expensive habit, fix it, and watch your equity curve respond." },
];

const TESTIMONIALS = [
  { q: "I finally see where my losses actually come from. Cut my revenge trades to almost zero in a month.", n: "Arjun M.", r: "Futures trader" },
  { q: "The equity growth candles are addictive — it genuinely makes me want to log every trade.", n: "Sofia L.", r: "Crypto swing trader" },
  { q: "Quick log means I never skip a trade anymore. The discipline score changed how I trade.", n: "Daniel K.", r: "Options trader" },
];

const FAQS = [
  ["Is JournalX free?", "Yes — you can start free with no card required, and every paid plan starts with a 7-day free trial. Paid plans unlock advanced analytics and higher limits."],
  ["Which markets does it support?", "Stocks, options, forex, futures and crypto — log any instrument, in any currency."],
  ["Can I import my existing trades?", "Yes. Import a CSV with our template, or connect a supported exchange to auto-sync your trade history."],
  ["Do you store my exchange keys safely?", "We only ever use read-only API keys, stored locally on your device, purely to fetch your trades."],
  ["Can I journal on mobile?", "Absolutely — JournalX is fully responsive with a dedicated mobile experience and quick log."],
];

/* ===== Analytics showcase data (recharts) ===== */
const PIE_DATA = [
  { name: "Wins", value: 58, color: C.green },
  { name: "Losses", value: 34, color: C.red },
  { name: "Break-even", value: 8, color: C.yellow },
];

const EQUITY_DATA = [
  { d: "W1", v: 0 }, { d: "W2", v: 380 }, { d: "W3", v: 290 }, { d: "W4", v: 720 },
  { d: "W5", v: 640 }, { d: "W6", v: 1080 }, { d: "W7", v: 960 }, { d: "W8", v: 1430 },
  { d: "W9", v: 1310 }, { d: "W10", v: 1820 }, { d: "W11", v: 2240 }, { d: "W12", v: 2680 },
];

const MONTH_PNL = [
  { m: "Jan", v: 540 }, { m: "Feb", v: -220 }, { m: "Mar", v: 860 }, { m: "Apr", v: 410 },
  { m: "May", v: -160 }, { m: "Jun", v: 1120 }, { m: "Jul", v: 730 }, { m: "Aug", v: 980 },
];

const tooltipStyle = {
  background: "rgba(13,17,23,0.96)",
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  fontFamily: "Poppins, sans-serif",
  fontSize: 12,
  color: C.text,
  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
};
/* recharts colours the tooltip label + items independently of contentStyle —
   force them light so they read on the dark tooltip card */
const tooltipLabelStyle = { color: "#eaecef", fontWeight: 600, marginBottom: 2 };
const tooltipItemStyle = { color: "#eaecef" };

/* Mounts its children only once scrolled into view, so recharts'
   built-in entrance animations replay exactly when the visitor arrives. */
function ChartCard({ title, caption, icon: Icon, height = 240, children, delay = 0 }) {
  const [shown, setShown] = useState(false);
  return (
    <motion.article
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      onViewportEnter={() => setShown(true)}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
      style={{ ...glass, borderRadius: 20, padding: 20, display: "flex", flexDirection: "column", minWidth: 0 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4 }}>
        <span style={{ display: "inline-flex", width: 32, height: 32, borderRadius: 9, background: "rgba(252,213,53,0.12)", color: C.yellow, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={15} />
        </span>
        <h3 style={{ font: "600 15px Poppins", margin: 0 }}>{title}</h3>
      </div>
      <p style={{ font: "400 12.5px/1.55 Poppins", color: C.dim, margin: "4px 0 12px" }}>{caption}</p>
      <div style={{ height, minWidth: 0 }}>
        {shown ? children : null}
      </div>
    </motion.article>
  );
}

function WinLossPie() {
  const reduced = useReducedMotion();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={PIE_DATA}
          dataKey="value"
          nameKey="name"
          innerRadius="58%"
          outerRadius="86%"
          paddingAngle={3}
          cornerRadius={6}
          stroke="none"
          isAnimationActive={!reduced}
          animationDuration={1100}
          animationBegin={150}
        >
          {PIE_DATA.map((s) => (
            <Cell key={s.name} fill={s.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} formatter={(v, n) => [`${v}%`, n]} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function EquityArea() {
  const reduced = useReducedMotion();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={EQUITY_DATA} margin={{ top: 6, right: 6, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="lpEquityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.yellow} stopOpacity={0.32} />
            <stop offset="100%" stopColor={C.yellow} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="d" tick={{ fill: C.dim, fontSize: 10, fontFamily: "Poppins" }} axisLine={false} tickLine={false} interval={2} />
        <YAxis tick={{ fill: C.dim, fontSize: 10, fontFamily: "Poppins" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={{ color: C.yellow }} formatter={(v) => [`$${v.toLocaleString()}`, "Equity"]} />
        <Area type="monotone" dataKey="v" stroke={C.yellow} strokeWidth={2.5} fill="url(#lpEquityFill)" isAnimationActive={!reduced} animationDuration={1400} animationBegin={200} dot={false} activeDot={{ r: 4, fill: C.yellow, stroke: C.canvas }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function MonthlyBars() {
  const reduced = useReducedMotion();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={MONTH_PNL} margin={{ top: 6, right: 6, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="m" tick={{ fill: C.dim, fontSize: 10, fontFamily: "Poppins" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: C.dim, fontSize: 10, fontFamily: "Poppins" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
        <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} formatter={(v) => [`${v < 0 ? "−" : "+"}$${Math.abs(v).toLocaleString()}`, "P&L"]} />
        <Bar dataKey="v" radius={[6, 6, 2, 2]} isAnimationActive={!reduced} animationDuration={1000} animationBegin={250}>
          {MONTH_PNL.map((m) => (
            <Cell key={m.m} fill={m.v >= 0 ? C.green : C.red} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ===== Layout helpers ===== */
function Section({ children, style, label, id }) {
  return (
    <section id={id} aria-label={label} style={{ maxWidth: 1160, margin: "0 auto", padding: "72px 20px", position: "relative", zIndex: 1, ...style }}>
      {children}
    </section>
  );
}

function SectionHead({ title, sub, kicker }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      style={{ textAlign: "center", marginBottom: 44 }}
    >
      {kicker && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "600 12px Poppins", letterSpacing: 1, textTransform: "uppercase", color: C.yellow, background: "rgba(252,213,53,0.1)", border: "1px solid rgba(252,213,53,0.22)", borderRadius: 999, padding: "5px 13px", marginBottom: 14 }}>
          {kicker}
        </span>
      )}
      <h2 style={{ font: "700 clamp(26px,4vw,40px)/1.12 Poppins", margin: "0 0 12px", letterSpacing: "-1px" }}>{title}</h2>
      {sub && <p style={{ font: "400 clamp(15px,2vw,17px)/1.6 Poppins", color: C.muted, maxWidth: 620, margin: "0 auto" }}>{sub}</p>}
    </motion.div>
  );
}

/* ===== Interactive analytics demo (try-it-yourself) ===== */
const DEMO_SEED = [
  { sym: "BTCUSDT", pnl: 320 },
  { sym: "AAPL", pnl: -110 },
  { sym: "EURUSD", pnl: 180 },
  { sym: "NQ", pnl: 240 },
];

function StatTile({ label, value, color, icon: Icon }) {
  return (
    <div className="lp-demo-tile" style={{ ...glassDeep, borderRadius: 12, padding: "11px 13px", minWidth: 0 }}>
      <div className="lp-demo-tile__label" style={{ display: "flex", alignItems: "center", gap: 5, font: "400 11px Poppins", color: C.dim, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        <Icon size={12} style={{ flexShrink: 0 }} /> {label}
      </div>
      <motion.div
        key={String(value)}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="lp-demo-tile__val"
        style={{ font: "700 19px Poppins", letterSpacing: "-0.5px", color: color || C.text, whiteSpace: "nowrap" }}
      >
        {value}
      </motion.div>
    </div>
  );
}

function InteractiveDemo() {
  const [trades, setTrades] = useState(DEMO_SEED);
  const [sym, setSym] = useState("");
  const [pnl, setPnl] = useState("");

  const add = () => {
    const v = parseFloat(pnl);
    if (!sym.trim() || Number.isNaN(v)) return;
    setTrades((t) => [...t, { sym: sym.trim().toUpperCase(), pnl: v }]);
    setSym("");
    setPnl("");
  };

  const total = trades.reduce((s, t) => s + t.pnl, 0);
  const wins = trades.filter((t) => t.pnl > 0).length;
  const winRate = trades.length ? Math.round((wins / trades.length) * 100) : 0;
  const grossWin = trades.filter((t) => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(trades.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
  const pf = grossLoss ? grossWin / grossLoss : grossWin > 0 ? 99 : 0;

  let cum = 0;
  const equity = trades.map((t) => (cum += t.pnl));
  const maxAbs = Math.max(1, ...equity.map((e) => Math.abs(e)));
  const abbr = (abs) =>
    abs >= 1250 ? `${(abs / 1000).toFixed(2).replace(/\.?0+$/, "")}k` : abs.toLocaleString();
  const money = (n) => `${n < 0 ? "−" : "+"}$${abbr(Math.abs(n))}`;

  const inputStyle = {
    background: "rgba(13,17,23,0.7)", border: `1px solid ${C.border}`, borderRadius: 10,
    padding: "12px 14px", color: C.text, font: "400 14px Poppins",
    width: "100%", maxWidth: "100%", boxSizing: "border-box", display: "block", outline: "none",
  };

  return (
    <div style={{ ...glass, borderRadius: 22, padding: 18, display: "grid", gridTemplateColumns: "minmax(0,0.85fr) minmax(0,1.15fr)", gap: 20 }} className="lp-demo-grid">
      <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, font: "600 15px Poppins" }}>Log a trade</div>
        <p style={{ font: "400 13px/1.6 Poppins", color: C.muted, margin: 0 }}>
          Type a symbol and a profit or loss, then hit add — watch the analytics on the right update instantly. This is the whole journaling loop, in under 10 seconds.
        </p>
        <label htmlFor="lp-demo-sym" style={{ font: "400 12px Poppins", color: C.dim }}>Symbol</label>
        <input id="lp-demo-sym" style={inputStyle} placeholder="e.g. BTCUSDT" value={sym} onChange={(e) => setSym(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <label htmlFor="lp-demo-pnl" style={{ font: "400 12px Poppins", color: C.dim }}>P&L ($)</label>
        <input id="lp-demo-pnl" style={inputStyle} type="number" placeholder="e.g. 250 or -90" value={pnl} onChange={(e) => setPnl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={add} style={{ ...btnPrimary, padding: "12px 18px", flex: 1, justifyContent: "center" }}><Plus size={16} /> Add trade</button>
          <button onClick={() => setTrades(DEMO_SEED)} title="Reset demo" aria-label="Reset demo" style={{ ...btnGhost, padding: "12px 14px" }}><RotateCcw size={15} /></button>
        </div>
        <div style={{ font: "400 12px Poppins", color: C.dim, marginTop: 2 }}>
          {trades.length} trade{trades.length === 1 ? "" : "s"} in this demo journal
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="lp-demo-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 8 }}>
          <StatTile label="Net P&L" value={money(total)} color={total >= 0 ? C.green : C.red} icon={TrendingUp} />
          <StatTile label="Win rate" value={`${winRate}%`} color={C.yellow} icon={Percent} />
          <StatTile label="Profit factor" value={pf >= 99 ? "∞" : pf.toFixed(2)} color={pf >= 1 ? C.green : C.red} icon={Activity} />
          <StatTile label="Wins" value={wins} color={C.yellow} icon={Trophy} />
        </div>

        <div style={{ ...glassDeep, borderRadius: 14, padding: "16px 16px 12px" }}>
          <div style={{ font: "400 12px Poppins", color: C.dim, marginBottom: 12 }}>Equity curve</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
            <AnimatePresence initial={false}>
              {equity.map((e, i) => {
                const pos = e >= 0;
                const h = Math.max(6, Math.round((Math.abs(e) / maxAbs) * 104));
                return (
                  <motion.div
                    key={i}
                    layout
                    initial={{ opacity: 0, scaleY: 0.2 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    title={`${trades[i].sym}: ${money(trades[i].pnl)}  ·  equity ${money(e)}`}
                    style={{ flex: 1, minWidth: 0, height: h, transformOrigin: "bottom", borderRadius: 6, background: pos ? C.green : C.red, cursor: "help" }}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        </div>
        <div style={{ font: "400 12px Poppins", color: C.dim, textAlign: "center" }}>
          In JournalX this also tracks R-multiples, emotion and discipline — automatically.
        </div>
      </div>
    </div>
  );
}

/* ===== Continuous linear marquee (pauses on hover; respects reduced motion) ===== */
function Marquee({ children, duration = 32, fade = true }) {
  return (
    <div className="lp-marquee" style={{ position: "relative", overflow: "hidden", width: "100%", maskImage: fade ? "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)" : undefined, WebkitMaskImage: fade ? "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)" : undefined }}>
      <div className="lp-marquee__track" style={{ display: "flex", width: "max-content", animationDuration: `${duration}s` }}>
        <div className="lp-marquee__row">{children}</div>
        <div className="lp-marquee__row" aria-hidden="true">{children}</div>
      </div>
    </div>
  );
}

const EXCHANGES = [
  "Binance", "Bybit", "OKX", "Coinbase", "Kraken", "KuCoin",
  "Bitget", "MEXC", "Gate.io", "BingX", "Deribit", "CSV import",
];

function ExchangeChip({ name }) {
  return (
    <span style={{ ...glass, display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 20px", borderRadius: 12, font: "600 16px Poppins", color: "#d6dae0", whiteSpace: "nowrap" }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.green, flexShrink: 0 }} />
      {name}
    </span>
  );
}

const BLOG_ACCENT = {
  Strategy: "#fcd535", Risk: "#2ebd85", Psychology: "#a78bfa",
  Journaling: "#38bdf8", Markets: "#fb7185",
};

function BlogCard({ post }) {
  const accent = BLOG_ACCENT[post.category] || C.yellow;
  return (
    <a href={`/blog/${post.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
      <article style={{ ...glass, width: 300, borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", height: 188 }}>
        <div style={{ height: 5, background: `linear-gradient(90deg, ${accent}, transparent)` }} aria-hidden="true" />
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
          <span style={{ display: "inline-flex", alignSelf: "flex-start", padding: "3px 10px", borderRadius: 999, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, font: "600 11px Poppins", color: accent }}>
            {post.category} · {post.minutes} min
          </span>
          <h3 style={{ font: "600 16px/1.35 Poppins", color: C.text, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", margin: 0 }}>{post.title}</h3>
          <p style={{ font: "400 13px/1.5 Poppins", color: C.muted, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", margin: 0 }}>{post.excerpt}</p>
          <span style={{ marginTop: "auto", font: "400 12px Poppins", color: C.dim }}>{fmtDate(post.date)}</span>
        </div>
      </article>
    </a>
  );
}

/* ===== Pricing section (in-page checkout — mirrors the /pricing flow) ===== */
function PricingSection() {
  // shared checkout flow (currency + Paddle/crypto + payment modal state)
  const { plans, isModalOpen, selectedPlan, payLoading, handlePlanClick, handlePaymentOptionClick, closeModal } =
    usePlanCheckout({ loginRedirect: "/pricing" });

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const CARDS = [
    { key: "free", title: "Free", price: plans.free.price, period: "forever", features: PLANS_FEATURES.free, cta: "Start free", href: "/register", note: "No card required" },
    { key: "monthly", title: "Pro Monthly", price: plans.monthly.price, period: "/ month", features: PLANS_FEATURES.pro, cta: "Get monthly", note: "Billed monthly · cancel anytime" },
    { key: "yearly", title: "Pro Yearly", price: plans.yearly.price, period: "/ year", features: PLANS_FEATURES.pro, cta: "Get yearly", popular: true, badge: "Save 28%", note: "7-day free trial · no card" },
    { key: "lifetime", title: "Lifetime", price: plans.lifetime.price, period: "once", features: PLANS_FEATURES.lifetime, cta: "Get lifetime", badge: "Best value", note: "One-time payment · yours forever" },
  ];

  return (
    <Section id="pricing" label="Pricing plans" style={{ scrollMarginTop: 80 }}>
      <SectionHead
        kicker="Pricing"
        title={<>Simple pricing that pays for <span style={{ color: C.yellow }}>itself</span></>}
        sub="Start free and upgrade when you're ready. Every plan pays for itself the first time it saves you from one bad habit."
      />

      {/* compact trust badge — above the cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45 }}
        style={{ display: "flex", justifyContent: "center", margin: "-6px 0 26px" }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 15px", borderRadius: 999, background: "rgba(46,189,133,0.10)", border: "1px solid rgba(46,189,133,0.35)", font: "600 13px Poppins", color: C.green, whiteSpace: "nowrap" }}>
          <Sparkles size={14} aria-hidden="true" /> 7 days free trial — no card required
        </span>
      </motion.div>

      <div className="lp-pricing-grid" style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(248px, 1fr))", gap: 18, alignItems: "stretch", paddingTop: 16 }}>
        {CARDS.map((c, i) => {
          const btnStyle = {
            width: "100%", boxSizing: "border-box", marginTop: "auto", justifyContent: "center", display: "inline-flex", alignItems: "center", gap: 8,
            borderRadius: 12, padding: "13px", cursor: "pointer", font: "600 14px Poppins",
            background: c.popular ? `linear-gradient(90deg, ${C.yellow}, ${C.yellowDeep})` : "rgba(255,255,255,0.08)",
            border: c.popular ? "none" : `1px solid ${C.border}`,
            color: c.popular ? "#1e2329" : "#fff",
          };
          return (
            <motion.div
              key={c.key}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -8, transition: { duration: 0.2 } }}
              style={{
                position: "relative", display: "flex", flexDirection: "column",
                background: c.popular
                  ? "linear-gradient(160deg, rgba(252,213,53,0.1), rgba(22,26,32,1))"
                  : "rgba(22,26,32,0.66)",
                backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
                border: `1px solid ${c.popular ? "rgba(252,213,53,0.42)" : C.border}`,
                borderRadius: 20, padding: 26,
                boxShadow: c.popular ? "0 14px 38px rgba(0,0,0,0.34)" : "0 8px 24px rgba(0,0,0,0.22)",
              }}
            >
              {c.popular && (
                <span style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", background: C.yellow, color: "#1e2329", font: "700 11px Poppins", padding: "4px 12px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
                  <Crown size={12} /> MOST POPULAR
                </span>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                <span style={{ font: "600 17px Poppins" }}>{c.title}</span>
                {c.badge && !c.popular && (
                  <span style={{ background: "rgba(46,189,133,0.15)", color: C.green, font: "600 11px Poppins", padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap" }}>{c.badge}</span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "10px 0 4px" }}>
                <span style={{ font: "700 34px Poppins", letterSpacing: "-1px" }}>{c.price}</span>
                <span style={{ font: "400 14px Poppins", color: C.dim }}>{c.period}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 11, margin: "20px 0 24px", flex: 1 }}>
                {c.features.map((f) => (
                  <span key={f.text} style={{ display: "flex", alignItems: "flex-start", gap: 9, font: "400 14px/1.4 Poppins", color: C.muted }}>
                    <Check size={16} style={{ color: C.green, flexShrink: 0, marginTop: 2 }} aria-hidden="true" /> {f.text}
                  </span>
                ))}
              </div>
              {c.key === "free" ? (
                <a href="/register" style={{ ...btnStyle, textDecoration: "none" }} aria-label={`${c.cta} — ${c.title} plan`}>
                  <Zap size={15} aria-hidden="true" /> {c.cta}
                </a>
              ) : (
                <button onClick={() => handlePlanClick(c.key)} style={btnStyle} aria-label={`${c.cta} — ${c.title} plan`}>
                  <Zap size={15} aria-hidden="true" /> {c.cta}
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* trust badges + start-free CTA — clearly below the cards */}
      <div
        style={{
          position: "relative",
          zIndex: 5,
          marginTop: 48,
          paddingTop: 30,
          borderTop: `1px solid ${C.border}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 22,
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", gap: 28, flexWrap: "wrap", font: "400 13px Poppins", color: C.dim }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}><ShieldCheck size={15} style={{ color: C.green }} aria-hidden="true" /> 256-bit encrypted</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Check size={15} style={{ color: C.green }} aria-hidden="true" /> Cancel anytime</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Check size={15} style={{ color: C.green }} aria-hidden="true" /> Cards, PayPal & crypto</span>
        </div>
        <a href="/register" style={{ textDecoration: "none" }} aria-label="Start free — create your JournalX account">
          <button style={{ ...btnPrimary, padding: "15px 34px", fontSize: 15, background: `linear-gradient(90deg, ${C.yellow}, ${C.yellowDeep})`, boxShadow: "0 8px 28px rgba(252,213,53,0.3)" }}>
            Start free <ArrowRight size={16} aria-hidden="true" />
          </button>
        </a>
      </div>

      {/* in-page checkout (same flow as /pricing) */}
      <PaddleLoader />
      {mounted && isModalOpen && selectedPlan &&
        createPortal(
          <PaymentModal
            isOpen={isModalOpen}
            onClose={closeModal}
            planTitle={plans[selectedPlan]?.title || ""}
            planPrice={plans[selectedPlan]?.price || ""}
            onPaymentOptionClick={handlePaymentOptionClick}
            loadingOption={payLoading}
          />,
          document.body,
        )}
    </Section>
  );
}

/* ===================================================================== */

export default function Home({ posts = [] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [faq, setFaq] = useState(0);

  useEffect(() => {
    if (Cookies.get("isVerified") === "yes") router.push("/dashboard");
    else setLoading(false);
  }, [router]);

  /* The auth check renders the loader as a full-screen overlay (instead of
     replacing the page) so the complete landing markup + SEO head is always
     server-rendered for crawlers, while logged-in users still see only the
     loader until they're redirected to /dashboard. */

  /* ===== Structured data ===== */
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "JournalX",
    url: SITE_URL,
    logo: `${SITE_URL}/assets/JournalX_Favicon.png`,
    description: "JournalX builds the all-in-one trading journal for stocks, options, forex, futures and crypto traders.",
  };
  const appLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "JournalX",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web, iOS, Android",
    description: DESC,
    url: SITE_URL,
    image: `${SITE_URL}/assets/JournalX_Banner.png`,
    aggregateRating: { "@type": "AggregateRating", ratingValue: "4.8", ratingCount: "1240" },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: PLANS_CONFIG.free.amount,
      highPrice: PLANS_CONFIG.lifetime.amount,
      offerCount: 4,
      offers: Object.values(PLANS_CONFIG).map((p) => ({
        "@type": "Offer",
        name: p.title,
        price: p.amount,
        priceCurrency: "USD",
        url: `${SITE_URL}/pricing`,
        availability: "https://schema.org/InStock",
      })),
    },
    publisher: { "@type": "Organization", name: "JournalX", url: SITE_URL },
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
  const siteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "JournalX",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/blog?search={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <Head>
        <title>{TITLE}</title>
        <meta name="description" content={DESC} />
        <meta name="keywords" content="trading journal, trade journal app, trading journal software, trade log analysis, stock trading journal, forex trading journal, crypto trading journal, futures journal, options tracker, trade analytics, trading psychology, risk management, R-multiple, win rate tracker, equity curve, journalx" />
        <meta name="author" content="JournalX" />
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
        <link rel="canonical" href={SITE_URL} />
        <meta key="og:type" property="og:type" content="website" />
        <meta key="og:site_name" property="og:site_name" content="JournalX" />
        <meta key="og:title" property="og:title" content={TITLE} />
        <meta key="og:description" property="og:description" content={DESC} />
        <meta key="og:url" property="og:url" content={SITE_URL} />
        <meta key="og:image" property="og:image" content={`${SITE_URL}/assets/JournalX_Banner.png`} />
        <meta key="og:image:alt" property="og:image:alt" content="JournalX trading journal dashboard with trade analytics, equity curve and P&L calendar" />
        <meta key="og:image:width" property="og:image:width" content="1200" />
        <meta key="og:image:height" property="og:image:height" content="630" />
        <meta key="og:locale" property="og:locale" content="en_US" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESC} />
        <meta name="twitter:image" content={`${SITE_URL}/assets/JournalX_Banner.png`} />
        <meta name="twitter:image:alt" content="JournalX trading journal dashboard with trade analytics" />
        <meta name="theme-color" content="#0d1117" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteLd) }} />
      </Head>

      {loading && <FullPageLoader />}

      <div style={{ background: C.canvas, color: C.text, fontFamily: "Poppins, sans-serif", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
        <AuroraBackdrop />
        <LandingNav />

        <main style={{ position: "relative", zIndex: 1 }}>
          {/* ===== Hero ===== */}
          <Section label="Hero" style={{ paddingTop: 72, paddingBottom: 48, textAlign: "center", position: "relative" }}>
            <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "radial-gradient(720px 400px at 50% -10%, rgba(252,213,53,0.16), transparent 70%)", pointerEvents: "none" }} />
            <HeroBackdrop />
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ position: "relative", zIndex: 1 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(252,213,53,0.12)", border: "1px solid rgba(252,213,53,0.3)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", color: C.yellow, borderRadius: 999, padding: "6px 14px", font: "600 13px Poppins", marginBottom: 22 }}>
                <Sparkles size={14} aria-hidden="true" /> Full trade analysis in under 10 seconds
              </span>
              <h1 style={{ font: "700 clamp(34px, 6vw, 60px)/1.08 Poppins", margin: "0 auto 18px", maxWidth: 880, letterSpacing: "-1.5px" }}>
                The trading journal that finds your edge in{" "}
                <span style={{ background: `linear-gradient(90deg, ${C.yellow}, ${C.yellowDeep})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
                  under 10 seconds
                </span>
              </h1>
              <p style={{ font: "400 clamp(16px,2.2vw,19px)/1.6 Poppins", color: C.muted, maxWidth: 640, margin: "0 auto 30px" }}>
                JournalX logs your trades in seconds and instantly turns them into the analytics that actually grow an account — win rate, R-multiples, risk and psychology. For stocks, options, forex, futures and crypto.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <a href="/register" style={{ textDecoration: "none" }}>
                  <button style={{ ...btnPrimary, padding: "14px 26px", fontSize: 15, background: `linear-gradient(90deg, ${C.yellow}, ${C.yellowDeep})`, boxShadow: "0 8px 28px rgba(252,213,53,0.3)" }}>
                    Start journaling free <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </a>
                <a href="/dashboard" style={{ textDecoration: "none" }}>
                  <button style={{ ...btnGhost, padding: "14px 26px", fontSize: 15, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", background: "rgba(255,255,255,0.04)" }}>
                    Try the live demo
                  </button>
                </a>
              </div>
              <div style={{ display: "flex", gap: 22, justifyContent: "center", flexWrap: "wrap", marginTop: 26, font: "400 13px Poppins", color: C.dim }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Check size={14} style={{ color: C.green }} aria-hidden="true" /> Free to start</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Check size={14} style={{ color: C.green }} aria-hidden="true" /> No card required</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Check size={14} style={{ color: C.green }} aria-hidden="true" /> All markets</span>
              </div>
            </motion.div>

            {/* signature animation — the live journal mock */}
            <motion.div
              initial={{ opacity: 0, y: 28, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.25, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              style={{ position: "relative", zIndex: 1, marginTop: 54, maxWidth: 860, marginInline: "auto" }}
            >
              <div aria-hidden="true" style={{ position: "absolute", inset: "-40px -60px", background: "radial-gradient(60% 70% at 50% 50%, rgba(252,213,53,0.09), transparent 70%)", pointerEvents: "none", filter: "blur(8px)" }} />
              <JournalMock />
            </motion.div>
          </Section>

          {/* ===== Social proof: stats + exchanges ===== */}
          <Section label="Social proof" style={{ paddingTop: 8, paddingBottom: 8 }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, maxWidth: 760, margin: "0 auto 52px" }}
            >
              {[["250k+", "Trades logged"], ["4.8★", "Avg. rating"], ["40+", "Markets"], ["10s", "To log a trade"]].map(([v, l]) => (
                <div key={l} style={{ ...glass, borderRadius: 16, padding: "18px 16px", textAlign: "center" }}>
                  <div style={{ font: "700 26px Poppins", color: C.yellow, letterSpacing: "-1px" }}>{v}</div>
                  <div style={{ font: "400 13px Poppins", color: C.muted }}>{l}</div>
                </div>
              ))}
            </motion.div>
            <p style={{ textAlign: "center", font: "600 13px Poppins", letterSpacing: 0.6, textTransform: "uppercase", color: C.dim, margin: "0 0 22px" }}>
              Import your trade logs from your exchange or broker
            </p>
            <Marquee duration={34}>
              {EXCHANGES.map((name) => (
                <span key={name} style={{ marginRight: 16 }}><ExchangeChip name={name} /></span>
              ))}
            </Marquee>
            <p style={{ textAlign: "center", font: "400 13px Poppins", color: C.dim, margin: "20px 0 0" }}>
              Auto-sync supported exchanges or upload a CSV — your history imports in minutes.
            </p>
          </Section>

          {/* ===== How it works ===== */}
          <Section label="How it works">
            <SectionHead kicker="How it works" title="From first log to lasting edge" sub="Three steps, repeated, compound into consistency." />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}>
              {STEPS.map((s, i) => (
                <motion.article
                  key={s.n}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}
                  style={{ ...glass, borderRadius: 18, padding: 28, position: "relative", overflow: "hidden" }}
                >
                  <div aria-hidden="true" style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle, rgba(252,213,53,0.1), transparent 70%)" }} />
                  <div style={{ font: "700 30px Poppins", background: `linear-gradient(180deg, ${C.yellow}, rgba(252,213,53,0.25))`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", marginBottom: 10 }}>{s.n}</div>
                  <h3 style={{ font: "600 18px Poppins", margin: "0 0 8px" }}>{s.title}</h3>
                  <p style={{ font: "400 14px/1.6 Poppins", color: C.muted, margin: 0 }}>{s.body}</p>
                </motion.article>
              ))}
            </div>
          </Section>

          {/* ===== Features ===== */}
          <Section id="features" label="Features" style={{ paddingTop: 24, scrollMarginTop: 80 }}>
            <SectionHead
              kicker="Features"
              title="Everything you need to trade like a pro"
              sub="One journal that scales from a 10-second log to full risk and psychology analytics."
            />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18 }}>
              {FEATURES.map(({ icon: Icon, title, body }, i) => (
                <motion.article
                  key={title}
                  initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 3) * 0.08, duration: 0.5 }}
                  whileHover={{ y: -4 }}
                  style={{ ...glass, borderRadius: 18, padding: 26 }}
                >
                  <span style={{ display: "inline-flex", width: 44, height: 44, borderRadius: 12, background: "linear-gradient(140deg, rgba(252,213,53,0.18), rgba(240,185,11,0.06))", border: "1px solid rgba(252,213,53,0.2)", color: C.yellow, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <h3 style={{ font: "600 18px Poppins", margin: "0 0 8px" }}>{title}</h3>
                  <p style={{ font: "400 14px/1.6 Poppins", color: C.muted, margin: 0 }}>{body}</p>
                </motion.article>
              ))}
            </div>
          </Section>

          {/* ===== Analytics showcase (recharts) ===== */}
          <Section id="analytics" label="Analytics showcase" style={{ scrollMarginTop: 80 }}>
            <SectionHead
              kicker="Analytics"
              title={<>See your trading the way the <span style={{ color: C.yellow }}>numbers</span> see it</>}
              sub="Every trade you log feeds live dashboards like these — win/loss breakdowns, equity growth and monthly P&L, computed automatically."
            />
            <div className="lp-charts-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0,0.85fr) minmax(0,1.3fr)", gap: 18 }}>
              <ChartCard icon={PieChartIcon} title="Win / loss breakdown" caption="Outcome split across your last 90 days — wins, losses and break-even trades." height={230}>
                <WinLossPie />
              </ChartCard>
              <ChartCard icon={TrendingUp} title="Equity curve" caption="Cumulative P&L week by week. Drawdowns become visible — and fixable." height={230} delay={0.1}>
                <EquityArea />
              </ChartCard>
            </div>
            <div style={{ marginTop: 18 }}>
              <ChartCard icon={BarChart3} title="Monthly P&L" caption="Green months and red months at a glance, so consistency is impossible to fake." height={210} delay={0.15}>
                <MonthlyBars />
              </ChartCard>
            </div>
            <p style={{ textAlign: "center", font: "400 13px Poppins", color: C.dim, margin: "22px 0 0" }}>
              Plus R-multiple distributions, P&L calendars, emotion analytics and per-strategy breakdowns — all included.
            </p>
          </Section>

          {/* ===== Why JournalX ===== */}
          <Section id="why" label="Why JournalX" style={{ scrollMarginTop: 80 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }} className="lp-why-grid">
              <motion.div initial={{ opacity: 0, x: -18 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.55 }}>
                <h2 style={{ font: "700 clamp(26px,4vw,38px)/1.12 Poppins", margin: "0 0 16px", letterSpacing: "-1px" }}>
                  Why traders switch to <span style={{ color: C.yellow }}>JournalX</span>
                </h2>
                <p style={{ font: "400 16px/1.7 Poppins", color: C.muted, marginBottom: 24 }}>
                  Spreadsheets are slow and blind. Broker statements are raw. JournalX is the only journal built to turn discipline and risk into metrics you can actually improve.
                </p>
                <a href="/register" style={{ textDecoration: "none" }}>
                  <button style={{ ...btnPrimary, padding: "13px 24px", background: `linear-gradient(90deg, ${C.yellow}, ${C.yellowDeep})` }}>Try it free <ArrowRight size={15} aria-hidden="true" /></button>
                </a>
              </motion.div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {WHY.map(([feat, vs], i) => (
                  <motion.div
                    key={feat}
                    initial={{ opacity: 0, x: 18 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06, duration: 0.45 }}
                    style={{ ...glass, borderRadius: 14, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}
                  >
                    <span style={{ marginTop: 2, color: C.green, flexShrink: 0 }} aria-hidden="true"><Check size={18} /></span>
                    <span>
                      <div style={{ font: "600 15px Poppins" }}>{feat}</div>
                      <div style={{ font: "400 13px Poppins", color: C.dim }}>{vs}</div>
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </Section>

          {/* ===== Interactive demo ===== */}
          <Section id="demo" label="Interactive demo" style={{ paddingTop: 24, scrollMarginTop: 80 }}>
            <SectionHead
              kicker="Try it"
              title="Try it right now — no signup"
              sub="Log a trade below and watch a live glimpse of your analytics update in real time. This is exactly how fast journaling feels in JournalX."
            />
            <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
              <InteractiveDemo />
            </motion.div>
          </Section>

          {/* ===== Testimonials ===== */}
          <Section label="Testimonials">
            <SectionHead kicker="Traders" title="Traders are building real edges" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
              {TESTIMONIALS.map((t, i) => (
                <motion.article
                  key={t.n}
                  initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5 }}
                  style={{ ...glass, borderRadius: 18, padding: 26 }}
                >
                  <div style={{ display: "flex", gap: 3, marginBottom: 14 }} aria-label="5 out of 5 stars">
                    {[...Array(5)].map((_, j) => <Star key={j} size={16} fill={C.yellow} color={C.yellow} aria-hidden="true" />)}
                  </div>
                  <p style={{ font: "400 15px/1.6 Poppins", color: "#d6dae0", margin: "0 0 18px" }}>“{t.q}”</p>
                  <div style={{ font: "600 14px Poppins" }}>{t.n}</div>
                  <div style={{ font: "400 13px Poppins", color: C.dim }}>{t.r}</div>
                </motion.article>
              ))}
            </div>
          </Section>

          {/* ===== Pricing ===== */}
          <PricingSection />

          {/* ===== From the blog ===== */}
          {posts.length > 0 && (
            <Section label="From the blog" style={{ paddingBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 28 }}>
                <div>
                  <h2 style={{ font: "700 clamp(26px,4vw,38px)/1.1 Poppins", margin: "0 0 8px", letterSpacing: "-1px" }}>Fresh trading lessons every week</h2>
                  <p style={{ font: "400 16px/1.6 Poppins", color: C.muted, margin: 0, maxWidth: 520 }}>Strategy, risk and psychology guides to turn each lesson into a measurable edge.</p>
                </div>
                <a href="/blog" style={{ textDecoration: "none" }}><button style={{ ...btnGhost, padding: "12px 20px" }}>Visit the blog <ArrowRight size={15} aria-hidden="true" /></button></a>
              </div>
              <Marquee duration={42}>
                {posts.map((p) => (
                  <span key={p.slug} style={{ marginRight: 18 }}><BlogCard post={p} /></span>
                ))}
              </Marquee>
            </Section>
          )}

          {/* ===== SEO long-form ===== */}
          <Section label="About the trading journal">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "start" }} className="lp-why-grid">
              <article>
                <h2 style={{ font: "700 clamp(24px,4vw,34px)/1.15 Poppins", margin: "0 0 16px", letterSpacing: "-1px" }}>
                  The trading journal built for every market
                </h2>
                <p style={{ font: "400 16px/1.7 Poppins", color: C.muted, margin: "0 0 14px" }}>
                  Whether you trade stocks, options, forex, futures or crypto, JournalX is the trading journal that adapts to you. Log any instrument in any currency, import your history from a spreadsheet or connect a supported exchange to auto-sync, and let the analytics engine do the rest. No formulas, no manual maths — just your trade log, analysed in under ten seconds.
                </p>
                <p style={{ font: "400 16px/1.7 Poppins", color: C.muted, margin: 0 }}>
                  Every trade you record feeds equity-growth candlesticks, R-multiple distributions, a colour-coded P&amp;L calendar and per-strategy breakdowns. The result is a clear, honest picture of where your profitability actually comes from — and exactly which habit is costing you the most.
                </p>
              </article>
              <article>
                <h2 style={{ font: "700 clamp(24px,4vw,34px)/1.15 Poppins", margin: "0 0 16px", letterSpacing: "-1px" }}>
                  Why a faster journal increases profitability
                </h2>
                <p style={{ font: "400 16px/1.7 Poppins", color: C.muted, margin: "0 0 14px" }}>
                  Profitability isn&apos;t found in one perfect trade — it&apos;s built by removing repeated mistakes. But you can only remove a leak you can measure, and you can only measure trades you actually log. That&apos;s why speed matters: when logging takes ten seconds instead of five minutes, you log every trade, your data stays complete, and your weekly review finally tells the truth.
                </p>
                <p style={{ font: "400 16px/1.7 Poppins", color: C.muted, margin: 0 }}>
                  JournalX scores your discipline at the moment of entry and tracks how emotion and risk affect your results, turning vague advice like &quot;control your psychology&quot; into a number you can watch improve. Fix one leak at a time and the equity curve responds — that&apos;s the entire compounding loop.
                </p>
              </article>
            </div>
          </Section>

          {/* ===== FAQ ===== */}
          <Section label="Frequently asked questions" style={{ maxWidth: 760 }}>
            <SectionHead kicker="FAQ" title="Frequently asked questions" />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {FAQS.map(([q, a], i) => (
                <div key={q} style={{ ...glass, borderRadius: 14, overflow: "hidden" }}>
                  <button onClick={() => setFaq(faq === i ? -1 : i)} aria-expanded={faq === i} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, background: "none", border: "none", color: C.text, cursor: "pointer", padding: "18px 20px", font: "600 16px Poppins", textAlign: "left" }}>
                    {q}
                    <span aria-hidden="true" style={{ color: C.yellow, transform: faq === i ? "rotate(45deg)" : "none", transition: "transform .25s ease", flexShrink: 0, fontSize: 20 }}>+</span>
                  </button>
                  <AnimatePresence initial={false}>
                    {faq === i && (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        style={{ overflow: "hidden" }}
                      >
                        <div style={{ padding: "0 20px 18px", font: "400 14px/1.6 Poppins", color: C.muted }}>{a}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </Section>

          {/* ===== Final CTA ===== */}
          <Section label="Get started" style={{ paddingBottom: 80 }}>
            <motion.div
              initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55 }}
              style={{ position: "relative", background: "linear-gradient(135deg, rgba(252,213,53,0.16), rgba(46,189,133,0.1))", border: "1px solid rgba(252,213,53,0.3)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderRadius: 24, padding: "56px 28px", textAlign: "center", overflow: "hidden" }}
            >
              <div aria-hidden="true" style={{ position: "absolute", top: -80, left: "50%", transform: "translateX(-50%)", width: 420, height: 220, background: "radial-gradient(closest-side, rgba(252,213,53,0.18), transparent)", filter: "blur(10px)", pointerEvents: "none" }} />
              <Flame size={34} style={{ color: C.yellow }} aria-hidden="true" />
              <h2 style={{ font: "700 clamp(26px,4vw,40px)/1.1 Poppins", margin: "14px 0 12px", letterSpacing: "-1px" }}>Your next trade deserves a journal</h2>
              <p style={{ font: "400 17px/1.6 Poppins", color: C.muted, maxWidth: 480, margin: "0 auto 26px" }}>Start free, log your first trade in under a minute, and see where your edge really is.</p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <a href="/register" style={{ textDecoration: "none" }}><button style={{ ...btnPrimary, padding: "14px 28px", fontSize: 15, background: `linear-gradient(90deg, ${C.yellow}, ${C.yellowDeep})`, boxShadow: "0 8px 28px rgba(252,213,53,0.3)" }}>Start journaling free <ArrowRight size={16} aria-hidden="true" /></button></a>
                <a href="/pricing" style={{ textDecoration: "none" }}><button style={{ ...btnGhost, padding: "14px 28px", fontSize: 15 }}>See pricing</button></a>
              </div>
            </motion.div>
          </Section>
        </main>

        <LandingFooter />
      </div>

      <style jsx global>{`
        .lp-marquee__track {
          animation-name: lp-marquee;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        .lp-marquee__row { display: flex; align-items: center; }
        .lp-marquee:hover .lp-marquee__track { animation-play-state: paused; }
        @keyframes lp-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .lp-marquee__track { animation: none; }
        }
        html { scroll-behavior: smooth; }
        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
        }
      `}</style>

      <style jsx>{`
        @media (max-width: 920px) {
          :global(.lp-charts-grid) { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 1120px) {
          :global(.lp-pricing-grid) { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 16px !important; padding-top: 18px !important; }
        }
        @media (max-width: 640px) {
          :global(.lp-pricing-grid) { grid-template-columns: 1fr !important; gap: 16px !important; max-width: 420px; margin: 0 auto; width: 100%; }
        }
        @media (max-width: 820px) {
          :global(.lp-why-grid) { grid-template-columns: 1fr !important; gap: 28px !important; }
          :global(.lp-demo-grid) { grid-template-columns: 1fr !important; gap: 16px !important; padding: 14px !important; }
          :global(.lp-mock-grid) { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          :global(.lp-demo-stats) { grid-template-columns: repeat(2, minmax(0,1fr)) !important; gap: 8px !important; }
          :global(.lp-demo-tile) { padding: 10px 12px !important; }
          :global(.lp-demo-tile__label) { font-size: 10px !important; }
          :global(.lp-demo-tile__val) { font-size: 17px !important; }
          :global(.lp-mock-stats) { grid-template-columns: repeat(3, minmax(0,1fr)) !important; gap: 6px !important; }
        }
      `}</style>
    </>
  );
}

/* Blog previews are resolved at build time (static JSON source) and passed
   as light-weight props so the page payload stays small. */
export async function getStaticProps() {
  const posts = getAllPosts()
    .slice(0, 8)
    .map((p) => ({
      slug: p.slug || "",
      title: p.title || "",
      excerpt: p.excerpt || "",
      category: p.category || "",
      minutes: p.minutes || 3,
      date: p.date || "",
    }));
  return { props: { posts } };
}
