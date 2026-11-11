"use client";

/* JournalX landing, v3 premium glassmorphic redesign.
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
  useTransform,
  useMotionValue,
  useSpring,
} from "framer-motion";
import {
  Activity,
  ArrowRight,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  BrainCircuit,
  CalendarDays,
  CandlestickChart,
  Check,
  Flame,
  LineChart as LineChartIcon,
  Percent,
  PieChart as PieChartIcon,
  Plus,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Trophy,
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
import { LandingFooter, btnPrimary, btnGhost } from "@/components/landingPage/LandingChrome";
import LightHero, { LightHeroHeader } from "@/components/landingPage/LightHero";
import HeroFeaturePanel from "@/components/landingPage/HeroFeaturePanel";
import { IntegrationsSection, HowItWorksSection, JourneySection } from "@/components/landingPage/LandingSections";
import sec from "@/components/landingPage/Sections.module.css";
import { BlogSection, AboutSection, FaqSection } from "@/components/landingPage/LandingBottom";
import PricingInteractive from "@/components/landingPage/PricingInteractive";
import heroStyles from "@/components/landingPage/LightHero.module.css";
import Testimonials from "@/components/landingPage/Testimonials";
import { getAllPosts } from "@/utils/blogs";
import BentoGrid from "@/components/landing/BentoGrid";
import Eyebrow from "@/components/landing/Eyebrow";
import {
  PLANS_CONFIG,
  buildPlansConfig,
  getUserCurrency,
  detectCurrencyByIP,
} from "@/utils/plans";

const SITE_URL = "https://journalx.app";
const TITLE = "Trading Journal for Funded & Prop Firm Traders | JournalX";
const DESC =
  "The trading journal for funded & prop firm traders. Track win rate, R-multiple, drawdown and psychology across forex, futures, stocks & crypto. Start free, no card.";

const C = {
  text: "#fff",
  muted: "#aeb4bc",
  dim: "#707a8a",
  canvas: "#000",
  surface: "#161a20",
  border: "rgba(255,255,255,0.1)",
  yellow: "#fcd535",
  yellowDeep: "#f0b90b",
  green: "#2ebd85",
  red: "#f6465d",
  // silver / platinum accents — used for decorative UI (icons, chips, step
  // numbers, stats). Gold stays reserved for the primary CTAs only.
  silver: "#c7ccd4",
  silverBright: "#eaecef",
  silverDeep: "#8b929c",
};
/* metallic silver gradient for large numerals */
const silverText = {
  background: "linear-gradient(180deg, #f2f4f6, #b9bec7 55%, #8b929c)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};
/* faint masked line-grid — apply behind select sections only, stays subtle */
const gridBg = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  zIndex: 0,
  backgroundImage:
    "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
  backgroundSize: "56px 56px",
  maskImage: "radial-gradient(80% 60% at 50% 40%, #000 30%, transparent 78%)",
  WebkitMaskImage: "radial-gradient(80% 60% at 50% 40%, #000 30%, transparent 78%)",
};

/* Shared card surface — flat bento look (matches BentoGrid .bd-card) */
const glass = {
  background: "#0d0d0d",
  border: "1px solid #1c1c1c",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
};
const glassDeep = {
  background: "#111",
  border: "1px solid #1c1c1c",
};

/* ===== Aurora gradient backdrop =====
   Low-alpha yellow/green/red blobs drifting slowly behind the whole page.
   Transform-only animation (cheap); static when reduced motion is on. */
const AURORA = [
  { top: -220, left: -140, size: 620, color: "rgba(199,204,212,0.06)", dur: 19, dx: 70, dy: 50 },
  { top: "26%", right: -240, size: 680, color: "rgba(46,189,133,0.07)", dur: 24, dx: -60, dy: 70 },
  { top: "58%", left: -200, size: 560, color: "rgba(246,70,93,0.055)", dur: 28, dx: 80, dy: -60 },
  { bottom: -260, right: "8%", size: 640, color: "rgba(199,204,212,0.05)", dur: 23, dx: -70, dy: -50 },
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

/* 3D interactive final-CTA card: mouse-tracked parallax tilt, layered depth
   (elements lifted on translateZ), a gradient-lit border, glossy sheen,
   floating shards and an ambient glow. Freezes flat under reduced motion. */
function CTA3D() {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotX = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 150, damping: 18 });
  const rotY = useSpring(useTransform(mx, [-0.5, 0.5], [-10, 10]), { stiffness: 150, damping: 18 });
  const glowX = useTransform(mx, [-0.5, 0.5], ["30%", "70%"]);
  const glowY = useTransform(my, [-0.5, 0.5], ["25%", "75%"]);

  const onMove = (e) => {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => { mx.set(0); my.set(0); };

  const shard = (style, anim, dur) => (
    <motion.div aria-hidden="true" style={{ position: "absolute", borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "linear-gradient(150deg, rgba(255,255,255,0.08), rgba(255,255,255,0.01))", backdropFilter: "blur(6px)", ...style }} animate={reduce ? {} : anim} transition={{ duration: dur, repeat: Infinity, ease: "easeInOut" }} />
  );

  return (
    <div style={{ perspective: 1200 }}>
      <motion.div
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        style={{
          position: "relative", transformStyle: "preserve-3d",
          rotateX: reduce ? 0 : rotX, rotateY: reduce ? 0 : rotY,
          borderRadius: 26, padding: 1.5,
          background: "linear-gradient(140deg, rgba(252,213,53,0.6), rgba(252,213,53,0.05) 38%, rgba(46,189,133,0.28) 70%, rgba(255,255,255,0.06))",
          boxShadow: "0 40px 90px -30px rgba(0,0,0,0.8), 0 0 60px -20px rgba(252,213,53,0.25)",
        }}
      >
        {/* inner surface */}
        <div style={{ position: "relative", borderRadius: 25, background: "linear-gradient(160deg, #0c0c0c, #050505)", padding: "clamp(48px,7vw,72px) 28px", textAlign: "center", overflow: "hidden" }}>
          {/* cursor-follow ambient glow */}
          <motion.div aria-hidden="true" style={{ position: "absolute", inset: 0, background: useTransform([glowX, glowY], ([x, y]) => `radial-gradient(420px 260px at ${x} ${y}, rgba(252,213,53,0.16), transparent 60%)`), pointerEvents: "none" }} />
          {/* faint 1px grid for depth */}
          <div aria-hidden="true" style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)", backgroundSize: "44px 44px", opacity: 0.5, maskImage: "radial-gradient(closest-side, #000, transparent)", WebkitMaskImage: "radial-gradient(closest-side, #000, transparent)", pointerEvents: "none" }} />
          {/* glossy top sheen */}
          <div aria-hidden="true" style={{ position: "absolute", top: 0, left: 0, right: 0, height: "45%", background: "linear-gradient(180deg, rgba(255,255,255,0.06), transparent)", pointerEvents: "none" }} />
          {/* floating 3D shards */}
          {shard({ top: 40, left: 40, width: 64, height: 64, transform: "translateZ(60px) rotate(-12deg)" }, { y: [0, -12, 0], rotate: [-12, -6, -12] }, 7)}
          {shard({ bottom: 46, right: 52, width: 84, height: 54, transform: "translateZ(90px) rotate(10deg)" }, { y: [0, 14, 0], rotate: [10, 4, 10] }, 9)}
          {shard({ top: 70, right: 90, width: 40, height: 40, borderRadius: 999, transform: "translateZ(120px)" }, { y: [0, -10, 0] }, 6)}

          <div style={{ position: "relative", transform: "translateZ(40px)" }}>
            <span aria-hidden="true" style={{ display: "inline-flex", width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", background: "linear-gradient(160deg, rgba(252,213,53,0.22), rgba(252,213,53,0.05))", border: "1px solid rgba(252,213,53,0.3)", boxShadow: "0 10px 30px -8px rgba(252,213,53,0.4)", marginBottom: 18 }}>
              <Flame size={26} style={{ color: C.yellow }} />
            </span>
            <h2 style={{ font: "600 clamp(28px,4vw,46px)/1.1 Poppins", margin: "0 0 12px", letterSpacing: "-0.03em" }}>Start your trading journal today</h2>
            <p style={{ font: "400 17px/1.6 Poppins", color: C.muted, maxWidth: 480, margin: "0 auto 28px" }}>Start free with no card, log your first trade in under a minute, and see where your edge really is.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <a href="/register" style={{ textDecoration: "none" }}><button style={{ ...btnPrimary, padding: "14px 28px", fontSize: 15, background: `linear-gradient(90deg, ${C.yellow}, ${C.yellowDeep})`, boxShadow: "0 12px 34px rgba(252,213,53,0.35)" }}>Start journaling free <ArrowRight size={16} aria-hidden="true" /></button></a>
              <a href="/pricing" style={{ textDecoration: "none" }}><button style={{ ...btnGhost, padding: "14px 28px", fontSize: 15, background: "rgba(255,255,255,0.02)" }}>See pricing</button></a>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
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
  const wrapRef = useRef(null);
  const [inView, setInView] = useState(false);

  // only animate while the mock is actually on screen, running the row
  // insert/remove loop off-screen reflows the page and "shakes" the scroll
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduced) {
      setCount(MOCK_TRADES.length);
      return;
    }
    if (!inView) return; // paused while off-screen
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
  }, [reduced, inView]);

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
      ref={wrapRef}
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
        <span style={{ font: "600 12px Poppins", color: C.muted, display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>JournalX · My Futures Journal</span>
        </span>
        {/* journal-created toast */}
        <span style={{ marginLeft: "auto", minHeight: 22, flexShrink: 0 }}>
          <AnimatePresence mode="wait">
            {!reduced && count === 0 && (
              <motion.span key="creating" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} style={{ display: "inline-flex", alignItems: "center", gap: 5, font: "600 11px Poppins", color: C.yellow, background: "rgba(252,213,53,0.1)", border: "1px solid rgba(252,213,53,0.25)", borderRadius: 999, padding: "4px 11px", whiteSpace: "nowrap" }}>
                <Sparkles size={11} /> Creating journal…
              </motion.span>
            )}
            {(reduced || count > 0) && (
              <motion.span key="created" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} style={{ display: "inline-flex", alignItems: "center", gap: 5, font: "600 11px Poppins", color: C.green, background: "rgba(46,189,133,0.1)", border: "1px solid rgba(46,189,133,0.25)", borderRadius: 999, padding: "4px 11px", whiteSpace: "nowrap" }}>
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
/* Why JournalX comparison: true = yes, false = no, string = partial */
const COMPARE = [
  ["Log a trade in about 10 seconds", true, "Minutes per trade", false],
  ["Win rate, profit factor and R-multiple", true, "Manual formulas", false],
  ["Equity curve and P&L calendar", true, "Manual charts", "Basic"],
  ["Trade screenshots and marked chart logs", true, "Links only", false],
  ["Daily and trailing drawdown tracking", true, "Manual", false],
  ["Discipline score on every trade", true, false, false],
  ["Emotion and mistake analytics", true, false, false],
  ["CSV import and exchange sync", true, "Copy and paste", "Export only"],
  ["Works on desktop and mobile", true, "Clunky on mobile", "App only"],
  ["Free to start, no card", true, true, true],
];

/* Glossary shown in the analytics section (also helps "what is ..." searches) */
const METRICS = [
  ["Win rate", "Share of trades that closed in profit."],
  ["Profit factor", "Gross profit divided by gross loss. Above 1 means the strategy makes money."],
  ["R-multiple", "Profit or loss measured in units of the risk you planned to take."],
  ["Expectancy", "Average amount you can expect to win or lose per trade."],
  ["Max drawdown", "Largest peak-to-trough drop in your account, the number prop firms enforce."],
];

const TESTIMONIALS = [
  { q: "I finally see where my losses actually come from. Cut my revenge trades to almost zero in a month.", n: "Arjun M.", r: "Futures trader" },
  { q: "The equity growth candles are addictive, it genuinely makes me want to log every trade.", n: "Sofia L.", r: "Crypto swing trader" },
  { q: "Quick log means I never skip a trade anymore. The discipline score changed how I trade.", n: "Daniel K.", r: "Options trader" },
];

const FAQS = [
  ["What is a trading journal and why do I need one?", "A trading journal is a record of every trade you take, entry, exit, size, risk, strategy and how you felt, turned into analytics you can review. You need one because profitability comes from removing repeated mistakes, and you can only fix a leak you can measure. JournalX automates the analysis so a few seconds of logging becomes a complete picture of your win rate, R-multiples, drawdown and psychology, and your weekly review finally tells the truth about your edge."],
  ["Is JournalX free?", "Yes, you can start free with no credit card required, and every paid plan starts with a 7-day free trial. The free plan is enough to log trades and see your core analytics; paid plans unlock advanced analytics, higher limits, auto-import and unlimited chart logging."],
  ["Is JournalX good for funded and prop firm traders?", "Yes, JournalX is built for funded and prop firm traders. Track your trailing and daily drawdown, monitor consistency, and use psychology and discipline analytics to protect your funded account and pass evaluations with firms like FTMO, Topstep, MyForexFunds and Apex. Your discipline becomes a number you can manage before it costs you the account."],
  ["Which markets and instruments does it support?", "Stocks, options, forex, futures and crypto, log any instrument in any currency. JournalX handles spot and leveraged positions, longs and shorts, and adapts price precision automatically so small-priced assets like SHIB or forex pairs are shown correctly."],
  ["How is JournalX different from a spreadsheet?", "A spreadsheet stores numbers; JournalX turns them into insight. Logging takes about ten seconds instead of five minutes, and you instantly get equity-growth candlesticks, an R-multiple distribution, a colour-coded P&L calendar, per-strategy and per-session breakdowns, drawdown tracking and a discipline score, all computed from your real trades, with nothing to maintain or break."],
  ["Can I import my existing trades?", "Yes. Import a CSV using our template, or connect a supported exchange to auto-sync your trade history. You can also log trades manually, with a quick one-field P&L log or a detailed entry, or mark your entry and exit directly on a chart."],
  ["Does JournalX track trading psychology and emotions?", "Yes. You can tag your emotion and confidence at entry and flag mistakes like FOMO, revenge trading, moving stops or oversizing. JournalX then quantifies how those behaviours affect your results, so vague advice like ‘control your psychology’ becomes a measurable score you can watch improve."],
  ["Do you store my exchange API keys safely?", "We only ever use read-only API keys, they cannot place trades or withdraw funds, and they are stored locally on your device purely to fetch your trade history. JournalX never holds your money or executes trades."],
  ["Can I journal on mobile?", "Absolutely, JournalX is fully responsive with a dedicated mobile experience, an installable app and a quick-log flow designed for logging on the go right after you close a trade."],
  ["Is my trading data private?", "Yes. Your trades are yours. We use your data only to provide the analytics in your account, your local cache stays on your device for fast, offline-friendly access, and we never sell your data. JournalX is a software tool, not a broker or financial service."],
  ["How quickly will I see my trading analytics?", "Immediately. The moment a trade is logged or imported, JournalX recomputes your metrics, typically a full trade-log analysis in under ten seconds, so your dashboard, equity curve and calendar are always up to date."],
];

/* ===== Analytics showcase data (recharts) ===== */
const PIE_DATA = [
  { name: "Wins", value: 58, color: C.green },
  { name: "Losses", value: 34, color: C.red },
  { name: "Break-even", value: 8, color: "#9aa1ab" },
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
/* recharts colours the tooltip label + items independently of contentStyle, so
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
        <span style={{ display: "inline-flex", width: 32, height: 32, borderRadius: 9, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: C.silverBright, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={15} strokeWidth={1.7} />
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
            <stop offset="0%" stopColor={C.silver} stopOpacity={0.26} />
            <stop offset="100%" stopColor={C.silver} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="d" tick={{ fill: C.dim, fontSize: 10, fontFamily: "Poppins" }} axisLine={false} tickLine={false} interval={2} />
        <YAxis tick={{ fill: C.dim, fontSize: 10, fontFamily: "Poppins" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={{ color: C.silverBright }} formatter={(v) => [`$${v.toLocaleString()}`, "Equity"]} />
        <Area type="monotone" dataKey="v" stroke={C.silverBright} strokeWidth={2.5} fill="url(#lpEquityFill)" isAnimationActive={!reduced} animationDuration={1400} animationBegin={200} dot={false} activeDot={{ r: 4, fill: C.silverBright, stroke: C.canvas }} />
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
function Section({ children, style, label, id, grid }) {
  return (
    <section id={id} aria-label={label} style={{ maxWidth: 1160, margin: "0 auto", padding: "72px 20px", position: "relative", zIndex: 1, ...style }}>
      {grid && <div aria-hidden="true" style={gridBg} />}
      {grid ? <div style={{ position: "relative", zIndex: 1 }}>{children}</div> : children}
    </section>
  );
}

function SectionHead({ title, sub, kicker, id }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={sec.head}
    >
      {kicker && <span className={sec.kicker}>{kicker}</span>}
      <h2 id={id} className={sec.h2}>{title}</h2>
      {sub && <p className={sec.lead}>{sub}</p>}
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
    background: "#111", border: "1px solid #1c1c1c", borderRadius: 10,
    padding: "12px 14px", color: C.text, font: "400 14px Poppins",
    width: "100%", maxWidth: "100%", boxSizing: "border-box", display: "block", outline: "none",
  };

  return (
    <div style={{ ...glass, borderRadius: 22, padding: 18, display: "grid", gridTemplateColumns: "minmax(0,0.85fr) minmax(0,1.15fr)", gap: 20 }} className="lp-demo-grid">
      <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, font: "600 15px Poppins" }}>Log a trade</div>
        <p style={{ font: "400 13px/1.6 Poppins", color: C.muted, margin: 0 }}>
          Type a symbol and a profit or loss, then hit add, watch the analytics on the right update instantly. This is the whole journaling loop, in under 10 seconds.
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
        <div style={{ ...glassDeep, borderRadius: 14, padding: "12px 14px" }}>
          <div style={{ font: "400 12px Poppins", color: C.dim, marginBottom: 8 }}>Journal</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {trades.slice(-6).reverse().map((t, i) => (
              <span key={`${t.sym}-${trades.length - i}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 999, background: "#141416", border: "1px solid #1e1e20", font: "500 12px Poppins", color: "#d6dae0" }}>
                {t.sym}<b style={{ color: t.pnl >= 0 ? C.green : C.red, fontWeight: 600 }}>{money(t.pnl)}</b>
              </span>
            ))}
          </div>
        </div>
        <div style={{ font: "400 12px Poppins", color: C.dim, textAlign: "center" }}>
          In JournalX this also tracks R-multiples, emotion and discipline, automatically.
        </div>
      </div>
    </div>
  );
}


/* ===================================================================== */

export default function Home({ posts = [] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

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
    description: "JournalX builds the advanced trading journal for funded and prop firm traders, across forex, futures, stocks, options and crypto.",
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
    audience: {
      "@type": "Audience",
      audienceType: "Funded traders, prop firm traders, forex, futures, stock, options and crypto traders",
    },
    featureList: [
      "In-depth trade-log analysis and pattern detection",
      "Funded & prop firm account tracking with drawdown alerts",
      "Trading psychology, emotion and discipline scoring",
      "Win rate, R-multiple, profit factor and equity curve analytics",
      "Auto-import from exchanges and CSV",
      "P&L calendar and per-strategy breakdowns",
    ],
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
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/blogs?search={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <Head>
        <title>{TITLE}</title>
        <meta name="description" content={DESC} />
        <meta name="keywords" content="trading journal, trading journal for funded traders, prop firm trading journal, funded account journal, FTMO journal, trading psychology app, trade journal app, trading journal software, trade analytics software, forex trading journal, futures trading journal, crypto trading journal, stock trading journal, options trading journal, trade analytics, risk management, drawdown tracker, R-multiple, win rate tracker, equity curve, journalx" />
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
        <meta name="theme-color" content="#000000" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteLd) }} />
      </Head>

      {loading && <FullPageLoader />}

      <div style={{ background: "#000", color: C.text, fontFamily: "Poppins, sans-serif", minHeight: "100vh", position: "relative", overflow: "clip" }}>
        <AuroraBackdrop />
        <LightHeroHeader />

        <main style={{ position: "relative", zIndex: 1 }}>
          {/* ===== Hero (light, crystal visuals) + feature panel ===== */}
          <LightHero />

          {/* ===== Live journal demo: a trade gets logged, analytics update ===== */}
          <section className={`${heroStyles.lx} ${heroStyles.demoSection}`} aria-labelledby="demo-live-title">
            <div className={heroStyles.wrap}>
              <span className={heroStyles.demoKicker}>See it in action</span>
              <h2 id="demo-live-title" className={heroStyles.demoTitle}>Log a trade, watch your analytics update</h2>
              <p className={heroStyles.demoText}>
                Each trade you add instantly updates your win rate, net P&amp;L, R-multiples and equity curve. No formulas, no spreadsheets.
              </p>
              <div className={heroStyles.demoStage}>
                <JournalMock />
              </div>
            </div>
          </section>

          <HeroFeaturePanel />
          <JourneySection />

          {/* x.ai-style bento grid: live demos of how logging pays off */}
          <BentoGrid />

          {/* ===== Brokers & exchanges · How it works · More tools ===== */}
          <IntegrationsSection />
          <HowItWorksSection />

          {/* ===== Analytics showcase (recharts) ===== */}
          <section id="analytics" className={sec.sec} aria-labelledby="analytics-title" style={{ scrollMarginTop: 80 }}>
            <div className={sec.inner}>
              <div className={sec.head}>
                <span className={sec.kicker}>Trading analytics</span>
                <h2 id="analytics-title" className={sec.h2}>Trading analytics that show <span>what is working</span>, and what is not</h2>
                <p className={sec.lead}>
                  Every trade you log feeds live dashboards: equity curve, win/loss breakdown, monthly P&amp;L and the core
                  performance metrics every trader should track, computed automatically from your trading journal.
                </p>
              </div>

              <div className={sec.anGrid}>
                <div className={sec.anEquity}>
                  <ChartCard icon={TrendingUp} title="Equity curve" caption="Cumulative P&L week by week. Drawdowns become visible, and fixable." height={250}>
                    <EquityArea />
                  </ChartCard>
                </div>
                <div className={sec.anPie}>
                  <ChartCard icon={PieChartIcon} title="Win / loss breakdown" caption="Outcome split across the last 90 days." height={190} delay={0.08}>
                    <WinLossPie />
                  </ChartCard>
                  <ul className={sec.legend} aria-label="Win loss split">
                    {PIE_DATA.map((d) => <li key={d.name}><i style={{ background: d.color }} />{d.name}<b>{d.value}%</b></li>)}
                  </ul>
                </div>
                <div className={sec.anBars}>
                  <ChartCard icon={BarChart3} title="Monthly P&L" caption="Green and red months at a glance, so consistency is impossible to fake." height={210} delay={0.12}>
                    <MonthlyBars />
                  </ChartCard>
                </div>
                <motion.div className={sec.glossary} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.5, delay: 0.15 }}>
                  <h3 className={sec.glossTitle}>Trading metrics JournalX tracks for you</h3>
                  <dl className={sec.gloss}>
                    {METRICS.map(([term, def]) => (
                      <div key={term}><dt>{term}</dt><dd>{def}</dd></div>
                    ))}
                  </dl>
                </motion.div>
              </div>
              <p className={sec.note}>Charts show sample data. Your dashboard is built from your own trades, including R-multiple distribution, P&amp;L calendar, emotion analytics and per-strategy breakdowns.</p>
            </div>
          </section>

          {/* ===== Why JournalX: comparison ===== */}
          <section id="why" className={sec.sec} aria-labelledby="why-title" style={{ scrollMarginTop: 80 }}>
            <div className={sec.inner}>
              <div className={sec.head}>
                <span className={sec.kicker}>Why JournalX</span>
                <h2 id="why-title" className={sec.h2}>A trading journal vs a <span>spreadsheet</span> or broker statement</h2>
                <p className={sec.lead}>
                  Spreadsheets are slow and break. Broker statements only show raw fills. JournalX turns discipline, risk
                  and psychology into metrics you can actually improve.
                </p>
              </div>
              <motion.div className={sec.cmpWrap} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.5 }}>
                <table className={sec.cmp}>
                  <caption className={sec.srOnly}>Comparison of JournalX, a spreadsheet and a broker statement for trade journaling</caption>
                  <thead>
                    <tr>
                      <th scope="col">What you get</th>
                      <th scope="col" className={sec.cmpUs}>JournalX</th>
                      <th scope="col">Spreadsheet</th>
                      <th scope="col">Broker statement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARE.map(([feat, us, sheet, broker]) => (
                      <tr key={feat}>
                        <th scope="row">{feat}</th>
                        {[us, sheet, broker].map((v, k) => (
                          <td key={k} className={k === 0 ? sec.cmpUs : undefined}>
                            {v === true ? <Check size={17} className={sec.yes} aria-label="Yes" /> : v === false ? <span className={sec.no} aria-label="No">—</span> : <span className={sec.partial}><span className={sec.partialText}>{v}</span><span className={sec.partialIcon} aria-hidden="true">~</span></span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>
              <p className={sec.cmpLegend}>~ means partial: possible, but manual or limited.</p>
              <div className={sec.ctaRow}>
                <a href="/register" className={sec.goldBtn}>Switch to JournalX free <ArrowRight size={15} aria-hidden="true" /></a>
              </div>
            </div>
          </section>

          {/* ===== Interactive demo ===== */}
          <Section id="demo" label="Interactive demo" style={{ paddingTop: 24, scrollMarginTop: 80 }}>
            <SectionHead
              kicker="Try it"
              title="Try the trading journal demo, no signup"
              sub="Log a trade below and watch a live glimpse of your analytics update in real time. This is exactly how fast journaling feels in JournalX."
            />
            <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
              <InteractiveDemo />
            </motion.div>
          </Section>

          {/* ===== Testimonials ===== */}
          {/* schema=false, the aggregateRating already lives in appLd above */}
          <Testimonials schema={false} />

          {/* ===== Pricing ===== */}
          <PricingInteractive />

          {/* ===== Blog · About · FAQ ===== */}
          <BlogSection posts={posts} />
          <AboutSection />
          <FaqSection faqs={FAQS} />

          {/* ===== Final CTA (3D interactive) ===== */}
          <Section label="Start your trading journal" style={{ paddingBottom: 80 }}>
            <CTA3D />
          </Section>
        </main>

        <LandingFooter />
      </div>

      <style jsx global>{`
        /* ===== feature card illustrations ===== */
        .lp-feat__art{ position:absolute; bottom:-10px; right:-8px; z-index:0; opacity:.7; }
        .feat-art{ display:block; overflow:visible; }
        .fa-row{ transform-origin:left center; animation:faRow 3.6s ease-in-out infinite; }
        @keyframes faRow{ 0%,100%{ transform:scaleX(.55); opacity:.5; } 50%{ transform:scaleX(1); opacity:1; } }
        .fa-bolt{ animation:faBolt 2.4s ease-in-out infinite; transform-origin:center; }
        @keyframes faBolt{ 0%,100%{ opacity:.5; } 50%{ opacity:1; } }
        .fa-bar{ transform-origin:center bottom; animation:faBar 3.2s ease-in-out infinite; }
        @keyframes faBar{ 0%,100%{ transform:scaleY(.55); } 50%{ transform:scaleY(1); } }
        .fa-draw{ stroke-dasharray:220; stroke-dashoffset:220; animation:faDraw 3.4s ease-in-out infinite; }
        @keyframes faDraw{ 0%{ stroke-dashoffset:220; } 55%,100%{ stroke-dashoffset:0; } }
        .fa-ring{ animation:faRing 4s ease-in-out infinite; }
        @keyframes faRing{ 0%,100%{ stroke-dashoffset:120; } 50%{ stroke-dashoffset:40; } }
        .fa-needle{ transform-origin:60px 60px; animation:faNeedle 4s ease-in-out infinite; }
        @keyframes faNeedle{ 0%,100%{ transform:rotate(-18deg); } 50%{ transform:rotate(24deg); } }
        .fa-check{ stroke-dasharray:44; stroke-dashoffset:44; animation:faCheck 3.4s ease-in-out infinite; }
        @keyframes faCheck{ 0%,20%{ stroke-dashoffset:44; } 45%,100%{ stroke-dashoffset:0; } }
        .fa-pulse{ transform-origin:60px 60px; animation:faPulse 3s ease-out infinite; }
        @keyframes faPulse{ 0%{ transform:scale(1); opacity:.5; } 70%,100%{ transform:scale(1.12); opacity:0; } }
        .fa-cell{ animation:faCell 3.6s ease-in-out infinite; }
        @keyframes faCell{ 0%,100%{ opacity:.35; } 50%{ opacity:1; } }
        .fa-blip{ animation:faBlip 2s ease-in-out infinite; }
        @keyframes faBlip{ 0%,100%{ opacity:.4; r:3; } 50%{ opacity:1; } }
        .fa-tape{ animation:faTape 2.6s linear infinite; }
        @keyframes faTape{ from{ stroke-dashoffset:0; } to{ stroke-dashoffset:-80; } }
        .fa-candle{ transform-origin:center bottom; animation:faCandle 3s ease-in-out infinite; }
        @keyframes faCandle{ 0%,100%{ transform:scaleY(.82); opacity:.75; } 50%{ transform:scaleY(1); opacity:1; } }
        .fa-phone{ animation:faPhone 3.4s ease-in-out infinite; }
        @keyframes faPhone{ 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(-3px); } }
        @media (max-width:560px){ .lp-feat__art{ opacity:.6; } .feat-art{ width:88px; height:88px; } }
        @media (prefers-reduced-motion: reduce){
          .fa-row,.fa-bolt,.fa-bar,.fa-draw,.fa-ring,.fa-needle,.fa-check,.fa-pulse,.fa-cell,.fa-blip,.fa-tape,.fa-candle,.fa-phone{ animation:none; }
          .fa-draw,.fa-check{ stroke-dashoffset:0; }
        }
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
        /* hero: masked glassmorphic line-grid with an animated glowing shine */
        .hero-grid{
          position:absolute; top:0; bottom:0; left:50%; transform:translateX(-50%);
          width:100vw; z-index:0; pointer-events:none; overflow:hidden;
          background-image:
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size:46px 46px;
          -webkit-mask-image:radial-gradient(115% 85% at 50% 32%, #000 0%, rgba(0,0,0,0.55) 46%, transparent 76%);
          mask-image:radial-gradient(115% 85% at 50% 32%, #000 0%, rgba(0,0,0,0.55) 46%, transparent 76%);
          -webkit-backdrop-filter:blur(0.5px);backdrop-filter:blur(0.5px);
        }
        /* soft brand glow pinned behind the grid so the lines read as lit glass */
        .hero-grid::after{
          content:"";position:absolute;inset:0;
          background:
            radial-gradient(46% 40% at 50% 30%, rgba(252,213,53,0.10), transparent 70%),
            radial-gradient(60% 50% at 50% 26%, rgba(255,255,255,0.05), transparent 72%);
          mix-blend-mode:screen;
        }
        /* diagonal light band that drifts across, subtly glowing as it passes */
        .hero-grid__shine{
          position:absolute;top:-40%;left:-30%;width:55%;height:180%;
          background:linear-gradient(115deg,
            transparent 44%,
            rgba(255,255,255,0.04) 49%,
            rgba(252,213,53,0.06) 51%,
            transparent 58%);
          filter:blur(10px);
          transform:translateX(-30%) rotate(2deg);
          animation:heroGridSheen 12s cubic-bezier(0.4,0,0.2,1) infinite;
        }
        @keyframes heroGridSheen{
          0%{ transform:translateX(-40%) rotate(2deg); opacity:0; }
          14%{ opacity:0.55; }
          52%{ opacity:0.55; }
          72%,100%{ transform:translateX(320%) rotate(2deg); opacity:0; }
        }
        @media (prefers-reduced-motion: reduce){
          .hero-grid__shine{ animation:none; opacity:0; }
        }
        /* hero: light sweeping across the bold "journal" word */
        .hero-shine{
          font-weight:600;
          background:linear-gradient(100deg,#b0b0b0 0%,#ffffff 44%,#ffffff 56%,#b0b0b0 100%);
          background-size:230% 100%;
          -webkit-background-clip:text;background-clip:text;
          -webkit-text-fill-color:transparent;color:transparent;
          filter:drop-shadow(0 0 20px rgba(255,255,255,0.18));
          animation:heroSheen 4.8s ease-in-out infinite;
        }
        @keyframes heroSheen{0%,100%{background-position:140% 0;}50%{background-position:-40% 0;}}
        /* hero: shimmering, glowing underline under the rotating focus word */
        .hero-uline{
          position:absolute;left:0;right:0;bottom:-0.06em;height:2px;border-radius:2px;
          background:linear-gradient(90deg,rgba(255,255,255,0.3) 0%,rgba(255,255,255,0.3) 40%,#ffffff 50%,rgba(255,255,255,0.3) 60%,rgba(255,255,255,0.3) 100%);
          background-size:220% 100%;
          box-shadow:0 0 14px rgba(255,255,255,0.5);
          animation:heroShimmer 2.6s linear infinite;
        }
        @keyframes heroShimmer{0%{background-position:200% 0;}100%{background-position:-200% 0;}}
        @media (prefers-reduced-motion: reduce){
          .hero-shine{animation:none;background-position:50% 0;}
          .hero-uline{animation:none;}
        }
        html { scroll-behavior: smooth; }
        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
        }
      `}</style>

      <style jsx>{`
        @media (max-width: 880px) {
          :global(.lp-hero-grid) { grid-template-columns: 1fr !important; gap: 30px !important; }
          :global(.lp-hero-copy) { text-align: center !important; }
          :global(.lp-hero-copy) p { margin-left: auto !important; margin-right: auto !important; }
          :global(.lp-hero-actions), :global(.lp-hero-trust) { justify-content: center !important; }
        }
        @media (max-width: 920px) {
          :global(.lp-charts-grid) { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 1120px) {
          :global(.lp-pricing-grid) { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 16px !important; padding-top: 18px !important; }
        }
        @media (max-width: 640px) {
          :global(.lp-pricing-grid) { grid-template-columns: 1fr !important; gap: 16px !important; max-width: 420px; margin: 0 auto; width: 100%; }
          /* hero CTAs: keep both on one row, compact */
          :global(.lp-hero-actions) { flex-wrap: nowrap !important; gap: 10px !important; }
          :global(.lp-hero-actions) a { flex: 1 1 0; min-width: 0; }
          :global(.lp-hero-actions) button { width: 100% !important; padding: 11px 12px !important; font-size: 13px !important; white-space: nowrap; }
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
