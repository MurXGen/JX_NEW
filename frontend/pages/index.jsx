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
  useScroll,
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
  Crown,
  Flame,
  LineChart as LineChartIcon,
  MonitorSmartphone,
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
import Testimonials from "@/components/landingPage/Testimonials";
import { getAllPosts, fmtDate } from "@/utils/blogs";
import BentoGrid from "@/components/landing/BentoGrid";
import Eyebrow from "@/components/landing/Eyebrow";
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
const TITLE = "JournalX, Trading Journal for Funded & Prop Firm Traders";
const DESC =
  "Advanced trading journal for funded & prop firm traders. Deep analytics on win rate, risk, drawdown & psychology across forex, futures, stocks & crypto. Start free, no card.";

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

/* Rotating underlined focus word (x.ai style). Every word truthfully completes
   "finds your ___", so the claim never changes. Slot width is fixed to the
   longest word so the centered headline never jiggles (no CLS). */
const HERO_WORDS = ["edge", "leaks", "patterns", "mistakes"];
function RotatingWord() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [w, setW] = useState(null);
  const sizeRef = useRef(null);
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setI((v) => (v + 1) % HERO_WORDS.length), 2600);
    return () => clearInterval(t);
  }, [reduce]);
  const word = reduce ? HERO_WORDS[0] : HERO_WORDS[i];
  // measure the exact rendered width so there's no trailing ch-overshoot gap
  useEffect(() => {
    if (sizeRef.current) setW(sizeRef.current.getBoundingClientRect().width);
  }, [word]);
  return (
    <span style={{ position: "relative", display: "inline-flex", justifyContent: "flex-start", width: w != null ? `${Math.ceil(w)}px` : `${word.length + 0.15}ch`, verticalAlign: "bottom", whiteSpace: "nowrap", transition: "width .4s cubic-bezier(0.22,1,0.36,1)" }}>
      <span ref={sizeRef} aria-hidden="true" style={{ position: "absolute", visibility: "hidden", whiteSpace: "nowrap", pointerEvents: "none", left: 0 }}>{word}</span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={word}
          initial={reduce ? false : { opacity: 0, filter: "blur(10px)", y: "0.24em" }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          exit={reduce ? undefined : { opacity: 0, filter: "blur(10px)", y: "-0.24em" }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: "relative", display: "inline-block", whiteSpace: "nowrap" }}
        >
          {word}
          <span className="hero-uline" aria-hidden="true" />
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/* Animated glowing hero backdrop — soft drifting radial glows on pure black
   (replaces the floating candles). Freezes under reduced motion. */
function HeroGlow() {
  const reduce = useReducedMotion();
  const glow = (style, anim, dur) => (
    <motion.div aria-hidden="true" style={{ position: "absolute", borderRadius: "50%", pointerEvents: "none", ...style }} animate={reduce ? {} : anim} transition={{ duration: dur, repeat: Infinity, ease: "easeInOut" }} />
  );
  return (
    <div aria-hidden="true" style={{ position: "absolute", top: 0, bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100vw", overflow: "hidden", zIndex: 0, pointerEvents: "none" }}>
      {glow({ top: "-14%", left: "50%", x: "-50%", width: "min(820px,90vw)", height: 480, background: "radial-gradient(closest-side, rgba(255,255,255,0.07), transparent 70%)", filter: "blur(30px)" }, { y: [0, 20, 0], opacity: [0.7, 1, 0.7] }, 9)}
      {glow({ top: "24%", left: "30%", width: 420, height: 360, background: "radial-gradient(closest-side, rgba(252,213,53,0.06), transparent 70%)", filter: "blur(44px)" }, { x: [0, 44, 0], y: [0, -26, 0], opacity: [0.45, 0.8, 0.45] }, 12)}
      {glow({ top: "18%", right: "28%", width: 380, height: 340, background: "radial-gradient(closest-side, rgba(46,189,133,0.05), transparent 70%)", filter: "blur(46px)" }, { x: [0, -38, 0], y: [0, 28, 0], opacity: [0.4, 0.7, 0.4] }, 14)}
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
            <h2 style={{ font: "300 clamp(28px,4vw,44px)/1.1 Poppins", margin: "0 0 12px", letterSpacing: "-0.02em" }}>Your next trade deserves a journal</h2>
            <p style={{ font: "400 17px/1.6 Poppins", color: C.muted, maxWidth: 480, margin: "0 auto 28px" }}>Start free, log your first trade in under a minute, and see where your edge really is.</p>
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

/* ===== Hero before/after "edge" graph, full-width, animated, interactive,
   with gradient fills/stroke and hoverable goal-reach milestones ===== */
const BEFORE_PATH = "M70,346 C 180,352 300,360 460,366";
const AFTER_PATH = "M460,366 C 615,360 705,306 815,240 S 1025,116 1150,70";
const GOALS = [
  { x: 460, y: 366, label: "Today", sub: "Start logging trades" },
  { x: 662, y: 316, label: "First green week", sub: "The habit forms" },
  { x: 828, y: 236, label: "Consistent edge", sub: "Discipline pays" },
  { x: 1000, y: 150, label: "Scaled up", sub: "Sizing with data" },
  { x: 1150, y: 70, label: "Funded payout", sub: "Goal reached" },
];

function EdgeGraph() {
  const [hover, setHover] = useState(null);
  const reduced = useReducedMotion();
  const draw = {
    initial: { pathLength: reduced ? 1 : 0, opacity: reduced ? 1 : 0 },
    whileInView: { pathLength: 1, opacity: 1 },
  };

  return (
    <svg
      viewBox="0 0 1200 470"
      width="100%"
      style={{ height: "auto", display: "block" }}
      role="img"
      aria-label="The quality of your trading edge before and after using JournalX, flat or declining before, rising steadily through clear milestones after."
    >
      <defs>
        <linearGradient id="jxAfterFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2ebd85" stopOpacity="0.42" />
          <stop offset="55%" stopColor="#2ebd85" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#2ebd85" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="jxBeforeFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f6465d" stopOpacity="0.24" />
          <stop offset="100%" stopColor="#f6465d" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="jxStroke" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#fcd535" />
          <stop offset="48%" stopColor="#7fe0b0" />
          <stop offset="100%" stopColor="#2ebd85" />
        </linearGradient>
        <radialGradient id="jxPivot" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fcd535" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#fcd535" stopOpacity="0" />
        </radialGradient>
        <filter id="jxGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="7" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="jxShadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#000000" floodOpacity="0.5" />
        </filter>
      </defs>

      {/* faint dashed gridlines, fading out to the right */}
      {[150, 240, 330].map((y) => (
        <line key={y} x1="70" y1={y} x2="1160" y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="2 8" />
      ))}

      {/* area fills */}
      <motion.path
        d={`${BEFORE_PATH} L460,404 L70,404 Z`}
        fill="url(#jxBeforeFill)"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      />
      <motion.path
        d={`${AFTER_PATH} L1150,404 L460,404 Z`}
        fill="url(#jxAfterFill)"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, delay: 0.5 }}
      />

      {/* baseline */}
      <line x1="70" y1="404" x2="1160" y2="404" stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" />

      {/* before line */}
      <motion.path
        d={BEFORE_PATH}
        fill="none"
        stroke="#f6465d"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.85"
        {...draw}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      />

      {/* after line — soft glow underlay + crisp gradient stroke */}
      <motion.path
        d={AFTER_PATH}
        fill="none"
        stroke="#2ebd85"
        strokeWidth="9"
        strokeLinecap="round"
        opacity="0.28"
        filter="url(#jxGlow)"
        {...draw}
        viewport={{ once: true }}
        transition={{ duration: 1.7, ease: "easeInOut", delay: 0.5 }}
      />
      <motion.path
        d={AFTER_PATH}
        fill="none"
        stroke="url(#jxStroke)"
        strokeWidth="4.5"
        strokeLinecap="round"
        {...draw}
        viewport={{ once: true }}
        transition={{ duration: 1.7, ease: "easeInOut", delay: 0.5 }}
      />

      {/* travelling light pulse along the after-curve */}
      {!reduced && (
        <motion.path
          d={AFTER_PATH}
          fill="none"
          stroke="#ffffff"
          strokeWidth="3"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="0.05 0.95"
          initial={{ strokeDashoffset: 1, opacity: 0 }}
          whileInView={{ strokeDashoffset: [1, 0], opacity: [0, 0.9, 0] }}
          viewport={{ once: true }}
          transition={{ duration: 2.4, ease: "linear", delay: 2.1, repeat: Infinity, repeatDelay: 1.6 }}
        />
      )}

      {/* pivot point: dashed split + glowing yellow node */}
      <line x1="460" y1="150" x2="460" y2="396" stroke="#f0b90b" strokeWidth="2" strokeDasharray="5 7" opacity="0.6" />
      <circle cx="460" cy="366" r="22" fill="url(#jxPivot)" />

      {/* labels — Before as a soft pill, After as a raised chip */}
      <rect x="150" y="372" width="150" height="30" rx="15" fill="rgba(246,70,93,0.12)" stroke="rgba(246,70,93,0.35)" />
      <text x="225" y="392" textAnchor="middle" fontFamily="Poppins, sans-serif" fontSize="14" fontWeight="600" fill="#f6465d">Before JournalX</text>
      <g filter="url(#jxShadow)">
        <rect x="348" y="102" width="224" height="46" rx="14" fill="#0d1117" stroke="rgba(255,255,255,0.16)" />
      </g>
      <circle cx="376" cy="125" r="4" fill="#2ebd85" />
      <text x="470" y="131" textAnchor="middle" fontFamily="Poppins, sans-serif" fontSize="19" fontWeight="700" fill="#ffffff">After JournalX</text>

      {/* "Your edge" annotation with a smooth curved arrow to the peak */}
      <text x="912" y="52" fontFamily="Poppins, sans-serif" fontSize="19" fontStyle="italic" fontWeight="600" fill="#c7ccd3">Your edge</text>
      <path d="M1030,56 C 1078,62 1100,84 1092,112" fill="none" stroke="#f0b90b" strokeWidth="2" strokeLinecap="round" />
      <path d="M1092,112 l-9,-6 l11,-3 Z" fill="#f0b90b" />

      {/* goal-reach milestones (interactive) */}
      {GOALS.map((g, i) => {
        const active = hover === i;
        const isEnd = i === GOALS.length - 1;
        const dotColor = i === 0 ? "#fcd535" : "#2ebd85";
        return (
          <motion.g
            key={g.label}
            initial={{ opacity: reduced ? 1 : 0, scale: reduced ? 1 : 0.2 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: reduced ? 0 : 0.6 + i * 0.28, type: "spring", stiffness: 320, damping: 18 }}
            style={{ cursor: "pointer" }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onTouchStart={() => setHover(i)}
          >
            {/* generous hit area */}
            <circle cx={g.x} cy={g.y} r="22" fill="transparent" />
            {/* soft halo behind every node */}
            <circle cx={g.x} cy={g.y} r={active ? 15 : 11} fill={dotColor} opacity="0.16" style={{ transition: "r .15s ease" }} />
            {isEnd && (
              <motion.circle
                cx={g.x}
                cy={g.y}
                r="10"
                fill="none"
                stroke="#2ebd85"
                strokeWidth="2"
                initial={{ opacity: 0.6, scale: 1 }}
                animate={reduced ? {} : { opacity: [0.6, 0, 0.6], scale: [1, 2.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
              />
            )}
            <circle cx={g.x} cy={g.y} r={active ? 9 : 6.5} fill={dotColor} stroke="#0d1117" strokeWidth="2.5" style={{ transition: "r .15s ease" }} />

            {/* tooltip */}
            {active && (
              <g pointerEvents="none" filter="url(#jxShadow)">
                <rect x={Math.min(Math.max(g.x - 110, 8), 980)} y={g.y - 74} width="220" height="54" rx="13" fill="#0d1117" stroke="rgba(255,255,255,0.18)" />
                <text x={Math.min(Math.max(g.x - 110, 8), 980) + 16} y={g.y - 48} fontFamily="Poppins, sans-serif" fontSize="16" fontWeight="700" fill="#ffffff">{g.label}</text>
                <text x={Math.min(Math.max(g.x - 110, 8), 980) + 16} y={g.y - 29} fontFamily="Poppins, sans-serif" fontSize="13" fill="#aeb4bc">{g.sub}</text>
              </g>
            )}
          </motion.g>
        );
      })}
    </svg>
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/JournalX_Favicon.png" alt="JournalX" style={{ height: 16, width: "auto", display: "block", flexShrink: 0 }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>· My Futures Journal</span>
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
const FEATURES = [
  { icon: Zap, title: "Log trades in seconds", body: "Quick log for P&L-only, or full detail with entries, risk, screenshots and emotions. Connect an exchange and trades import automatically." },
  { icon: BarChart3, title: "Analytics that find your edge", body: "Equity growth candles, P&L calendars, R-multiples, win rate trends, and per-strategy breakdowns, all computed from your real trades." },
  { icon: BrainCircuit, title: "Master your psychology", body: "Tag emotion and discipline on every trade. See exactly how much tilt and FOMO cost you, and where your real edge comes from." },
  { icon: ShieldCheck, title: "Protect your funded account", body: "Fixed-risk position sizing, planned vs realised R:R, profit factor and drawdown tracking, the metrics that keep funded and prop firm accounts alive." },
  { icon: CalendarDays, title: "See every day at a glance", body: "A colour-coded P&L calendar and activity heatmap make your consistency (or lack of it) impossible to ignore." },
  { icon: LineChartIcon, title: "Live market context", body: "Ticker tape, heatmaps, economic calendar and news, plus an 'if you'd held' live price check on closed trades." },
  { icon: CandlestickChart, title: "Mark trades on a chart", body: "Drop your entry and exit on a live chart, prices fill in automatically and the marked chart shows on the trade details across multiple timeframes." },
  { icon: MonitorSmartphone, title: "Works on desktop & mobile", body: "A fully responsive web app plus an installable PWA, journal on your laptop or log a trade from your phone the moment you close a position." },
];

const WHY = [
  ["Built for funded & prop firm traders", "Drawdown and consistency tracking most journals ignore"],
  ["Log a trade in 10 seconds", "Spreadsheets take minutes per trade, so you quit"],
  ["Discipline scored on every trade", "Generic journals only record numbers after the fact"],
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
      {kicker && <Eyebrow>{kicker}</Eyebrow>}
      <h2 style={{ font: "300 clamp(28px,3.8vw,44px)/1.12 Poppins", margin: "0 0 12px", letterSpacing: "-0.02em" }}>{title}</h2>
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
        <div style={{ font: "400 12px Poppins", color: C.dim, textAlign: "center" }}>
          In JournalX this also tracks R-multiples, emotion and discipline, automatically.
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
  // Stocks & options brokers
  "Interactive Brokers", "Thinkorswim", "Charles Schwab", "E*TRADE",
  "Webull", "Robinhood", "Fidelity", "Tastytrade",
  // Futures
  "NinjaTrader", "Tradovate", "AMP Futures",
  // Forex / CFD
  "MetaTrader 4", "MetaTrader 5", "OANDA", "cTrader", "IG",
  // Crypto
  "Binance", "Bybit", "Coinbase", "Kraken", "OKX",
  // Works with everything
  "CSV import",
];

/* Asset classes JournalX supports, shown as tags above the broker marquee */
const MARKET_TAGS = ["Stocks", "Options", "Futures", "Forex", "Crypto", "CFDs"];

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
  Journaling: "#38bdf8", Markets: "#fb7185", Funded: "#34d399",
};

function BlogCard({ post }) {
  const accent = BLOG_ACCENT[post.category] || C.yellow;
  return (
    <a href={`/blogs/${post.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
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

/* ===== Pricing section (in-page checkout, mirrors the /pricing flow) ===== */
function PricingSection() {
  // shared checkout flow (currency + Paddle/crypto + payment modal state)
  const { plans, currency, isModalOpen, selectedPlan, handlePlanClick, closeModal } =
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

      {/* compact trust badge, above the cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45 }}
        style={{ display: "flex", justifyContent: "center", margin: "-6px 0 26px" }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 15px", borderRadius: 999, background: "rgba(46,189,133,0.10)", border: "1px solid rgba(46,189,133,0.35)", font: "600 13px Poppins", color: C.green, whiteSpace: "nowrap" }}>
          <Sparkles size={14} aria-hidden="true" /> 7 days free trial, no card required
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
                <a href="/register" style={{ ...btnStyle, textDecoration: "none" }} aria-label={`${c.cta}, ${c.title} plan`}>
                  <Zap size={15} aria-hidden="true" /> {c.cta}
                </a>
              ) : (
                <button onClick={() => handlePlanClick(c.key)} style={btnStyle} aria-label={`${c.cta}, ${c.title} plan`}>
                  <Zap size={15} aria-hidden="true" /> {c.cta}
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* trust badges + start-free CTA, clearly below the cards */}
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
        <a href="/register" style={{ textDecoration: "none" }} aria-label="Start free, create your JournalX account">
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
            plans={plans}
            currency={currency}
            initialPlan={selectedPlan}
            loginRedirect="/pricing"
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

      <div style={{ background: "#000", color: C.text, fontFamily: "Poppins, sans-serif", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
        <AuroraBackdrop />
        <LandingNav />

        <main style={{ position: "relative", zIndex: 1 }}>
          {/* ===== Hero (two-column: copy + before/after edge graph) ===== */}
          <Section label="Hero" style={{ paddingTop: 96, paddingBottom: 72, position: "relative", background: "transparent" }}>
            {/* full-bleed pure-black backdrop so the hero has no navy seams on the sides */}
            <div aria-hidden="true" style={{ position: "absolute", top: 0, bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100vw", background: "#000", zIndex: 0, pointerEvents: "none" }} />
            {/* masked glassmorphic grid with an animated glowing shine sweep */}
            <div className="hero-grid" aria-hidden="true">
              <span className="hero-grid__shine" />
            </div>
            <HeroGlow />
            {/* centered intro copy (SEO unchanged) */}
            <motion.div className="lp-hero-copy" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: "min(1080px, 94vw)", marginInline: "auto" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#0d0d0d", border: "1px solid #222", color: "#9b9b9b", borderRadius: 999, padding: "6px 14px", fontFamily: "Poppins, sans-serif", fontWeight: 500, fontSize: 13, marginBottom: 28 }}>
                <Sparkles size={13} aria-hidden="true" style={{ color: C.yellow }} /> Full trade analysis in under 10 seconds
              </span>
              <h1 style={{ fontFamily: "Poppins, sans-serif", fontWeight: 300, fontSize: "clamp(34px, 5vw, 66px)", lineHeight: 1.08, letterSpacing: "-0.02em", margin: "0 auto 22px", maxWidth: 820, color: "#fff", textWrap: "balance" }}>
                The trading <span className="hero-shine">journal</span><br />that finds your <RotatingWord />
              </h1>
              <p style={{ fontFamily: "Poppins, sans-serif", fontWeight: 400, fontSize: "clamp(15px,1.5vw,17px)", lineHeight: 1.55, color: C.muted, maxWidth: 540, margin: "0 auto 30px" }}>
                Win rate, R-multiple, drawdown and trading psychology — across forex, futures and crypto. Built for funded and prop-firm traders.
              </p>
              <div className="lp-hero-actions" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <a href="/register" style={{ textDecoration: "none" }}>
                  <button style={{ ...btnPrimary, width: "100%", justifyContent: "center", fontFamily: "Poppins, sans-serif", fontWeight: 600, padding: "13px 26px", fontSize: 15, background: C.yellow, color: "#1e2329", border: "1px solid " + C.yellow, boxShadow: "none" }}>
                    Start journaling free <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </a>
                <a href="/dashboard" style={{ textDecoration: "none" }}>
                  <button style={{ ...btnGhost, width: "100%", justifyContent: "center", fontFamily: "Poppins, sans-serif", fontWeight: 500, padding: "13px 26px", fontSize: 15, color: "#fff", background: "transparent", border: "1px solid rgba(255,255,255,0.22)" }}>
                    Try demo
                  </button>
                </a>
              </div>
              <div className="lp-hero-trust" style={{ display: "flex", gap: 22, justifyContent: "center", flexWrap: "wrap", marginTop: 26, font: "400 13px Poppins", color: C.dim }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Check size={14} style={{ color: C.green }} aria-hidden="true" /> Free to start</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Check size={14} style={{ color: C.green }} aria-hidden="true" /> No card required</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Check size={14} style={{ color: C.green }} aria-hidden="true" /> All markets</span>
              </div>
            </motion.div>

            {/* signature animation, the live journal mock (how journaling is done) */}
            <motion.div
              initial={{ opacity: 0, y: 28, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              style={{ position: "relative", zIndex: 1, marginTop: 64, maxWidth: 860, marginInline: "auto" }}
            >
              <div aria-hidden="true" style={{ position: "absolute", inset: "-40px -60px", background: "radial-gradient(60% 70% at 50% 50%, rgba(252,213,53,0.09), transparent 70%)", pointerEvents: "none", filter: "blur(8px)" }} />
              <JournalMock />
            </motion.div>
          </Section>

          {/* x.ai-style bento grid: live demos of how logging pays off */}
          <BentoGrid />

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
            <p style={{ textAlign: "center", font: "600 13px Poppins", letterSpacing: 0.6, textTransform: "uppercase", color: C.dim, margin: "0 0 14px" }}>
              Import your trade logs from any exchange or broker
            </p>
            {/* Asset-class tags, JournalX isn't crypto-only */}
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, margin: "0 auto 24px", maxWidth: 560 }}>
              {MARKET_TAGS.map((m) => (
                <span key={m} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 13px", borderRadius: 999, background: "rgba(252,213,53,0.08)", border: "1px solid rgba(252,213,53,0.22)", font: "600 12.5px Poppins", color: C.yellow }}>
                  {m}
                </span>
              ))}
            </div>
            <Marquee duration={34}>
              {EXCHANGES.map((name) => (
                <span key={name} style={{ marginRight: 16 }}><ExchangeChip name={name} /></span>
              ))}
            </Marquee>
            <p style={{ textAlign: "center", font: "400 13px Poppins", color: C.dim, margin: "20px 0 0" }}>
              Auto-sync supported exchanges, connect your broker, or upload a CSV from any platform, your history imports in minutes.
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, flexWrap: "wrap", marginTop: 26 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, font: "500 14px Poppins", color: C.muted }}>
                <MonitorSmartphone size={16} style={{ color: C.green }} aria-hidden="true" /> Works on desktop + mobile · installable PWA · all markets
              </span>
              <a href="/features" style={{ textDecoration: "none" }}>
                <button style={{ ...btnGhost, padding: "12px 20px" }}>Explore all features <ArrowRight size={15} aria-hidden="true" /></button>
              </a>
            </div>
          </Section>

          {/* ===== Analytics showcase (recharts) ===== */}
          <Section id="analytics" label="Analytics showcase" style={{ scrollMarginTop: 80 }}>
            <SectionHead
              kicker="Analytics"
              title={<>See your trading the way the <span style={{ color: C.yellow }}>numbers</span> see it</>}
              sub="Every trade you log feeds live dashboards like these, win/loss breakdowns, equity growth and monthly P&L, computed automatically."
            />
            <div className="lp-charts-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0,0.85fr) minmax(0,1.3fr)", gap: 18 }}>
              <ChartCard icon={PieChartIcon} title="Win / loss breakdown" caption="Outcome split across your last 90 days, wins, losses and break-even trades." height={230}>
                <WinLossPie />
              </ChartCard>
              <ChartCard icon={TrendingUp} title="Equity curve" caption="Cumulative P&L week by week. Drawdowns become visible, and fixable." height={230} delay={0.1}>
                <EquityArea />
              </ChartCard>
            </div>
            <div style={{ marginTop: 18 }}>
              <ChartCard icon={BarChart3} title="Monthly P&L" caption="Green months and red months at a glance, so consistency is impossible to fake." height={210} delay={0.15}>
                <MonthlyBars />
              </ChartCard>
            </div>
            <p style={{ textAlign: "center", font: "400 13px Poppins", color: C.dim, margin: "22px 0 0" }}>
              Plus R-multiple distributions, P&L calendars, emotion analytics and per-strategy breakdowns, all included.
            </p>
          </Section>

          {/* ===== Why JournalX ===== */}
          <Section id="why" label="Why JournalX" style={{ scrollMarginTop: 80 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }} className="lp-why-grid">
              <motion.div initial={{ opacity: 0, x: -18 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.55 }}>
                <h2 style={{ font: "300 clamp(26px,4vw,38px)/1.12 Poppins", margin: "0 0 16px", letterSpacing: "-1px" }}>
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
              title="Try it right now, no signup"
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
          <PricingSection />

          {/* ===== From the blog ===== */}
          {posts.length > 0 && (
            <Section label="From the blog" style={{ paddingBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 28 }}>
                <div>
                  <h2 style={{ font: "300 clamp(26px,4vw,38px)/1.1 Poppins", margin: "0 0 8px", letterSpacing: "-1px" }}>Fresh trading lessons every week</h2>
                  <p style={{ font: "400 16px/1.6 Poppins", color: C.muted, margin: 0, maxWidth: 520 }}>Strategy, risk and psychology guides to turn each lesson into a measurable edge.</p>
                </div>
                <a href="/blogs" style={{ textDecoration: "none" }}><button style={{ ...btnGhost, padding: "12px 20px" }}>Visit the blog <ArrowRight size={15} aria-hidden="true" /></button></a>
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
                <h2 style={{ font: "300 clamp(24px,4vw,34px)/1.15 Poppins", margin: "0 0 16px", letterSpacing: "-1px" }}>
                  The trading journal built for funded and prop firm traders
                </h2>
                <p style={{ font: "400 16px/1.7 Poppins", color: C.muted, margin: "0 0 14px" }}>
                  Funded and prop firm traders don&apos;t just need profit, they need to stay inside the rules. JournalX is the trading journal built to protect a funded account: track your trailing and daily drawdown, watch your consistency, and get deep, data-driven insight into the overtrading, revenge trading and tilt that end most evaluations. Whether you&apos;re passing an FTMO, Topstep or Apex challenge or scaling a funded account, your discipline becomes a number you can actually manage.
                </p>
                <p style={{ font: "400 16px/1.7 Poppins", color: C.muted, margin: 0 }}>
                  It still works for every market you trade. Log forex, futures, stocks, options or crypto in any currency, import your history from a spreadsheet or auto-sync a supported exchange, and let the analytics engine feed equity-growth candlesticks, R-multiple distributions, a colour-coded P&amp;L calendar and per-strategy breakdowns, analysed in under ten seconds.
                </p>
              </article>
              <article>
                <h2 style={{ font: "300 clamp(24px,4vw,34px)/1.15 Poppins", margin: "0 0 16px", letterSpacing: "-1px" }}>
                  Why deeper analytics increase profitability
                </h2>
                <p style={{ font: "400 16px/1.7 Poppins", color: C.muted, margin: "0 0 14px" }}>
                  Profitability isn&apos;t found in one perfect trade, it&apos;s built by removing repeated mistakes. But you can only remove a leak you can measure, and you can only measure trades you actually log. That&apos;s why speed matters: when logging takes ten seconds instead of five minutes, you log every trade, your data stays complete, and your weekly review finally tells the truth.
                </p>
                <p style={{ font: "400 16px/1.7 Poppins", color: C.muted, margin: 0 }}>
                  JournalX scores your discipline at the moment of entry using purpose-built analytics, and surfaces how emotion, risk and drawdown affect your results, turning vague advice like &quot;control your trading psychology&quot; into a number you can watch improve. Every metric is computed from your real trade log, not estimated. Fix one leak at a time and the equity curve responds, that&apos;s the entire compounding loop.
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

          {/* ===== Final CTA (3D interactive) ===== */}
          <Section label="Get started" style={{ paddingBottom: 80 }}>
            <CTA3D />
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
