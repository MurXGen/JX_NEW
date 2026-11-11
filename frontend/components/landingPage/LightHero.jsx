"use client";

/* JournalX light hero.
   Announcement bar → floating nav card → big two-line H1 + CTAs with glass
   crystal visuals (inline SVG, framer-motion float + pointer/scroll parallax)
   → stats strip with rating badges.
   All copy is plain server-rendered markup; only decorative layers animate.
   Respects prefers-reduced-motion (no float, no parallax, no twinkle). */

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { ArrowRight, Globe2, Menu, NotebookPen, Star, Timer, X } from "lucide-react";
import Cookies from "js-cookie";
import s from "./LightHero.module.css";

const NAV = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blogs" },
  { label: "FAQ", href: "/#faq" },
];

/* Numbers reused from the existing landing page social-proof strip.
   Keep these in sync with real product data. */
const STATS = [
  { value: "250k+", label: "Trades logged", Icon: NotebookPen },
  { value: "40+", label: "Markets supported", Icon: Globe2 },
  { value: "10s", label: "To log a trade", Icon: Timer },
];

/* PLACEHOLDER — "4.8 average rating" is carried over from the old landing page
   and the SoftwareApplication JSON-LD (ratingCount 1240). Replace with a
   verifiable source (App Store / Play Store / Trustpilot) or remove. */
const RATING = { value: "4.8", outOf: "5", source: "Average user rating" };

/* ---------------- Announcement bar + floating nav ---------------- */
export function LightHeroHeader() {
  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(Cookies.get("isVerified") === "yes");
  }, []);

  return (
    <>
      <div className={`${s.lx} ${s.bar}`} role="note">
        <strong>Start journaling free</strong>, no card required.<span className={s.barLong}> Paid plans include a 7-day free trial.</span>
        <a href="/pricing">See plans →</a>
      </div>

      <header className={`${s.lx} ${s.navWrap}`}>
        <div className={s.wrap}>
          <div className={s.nav}>
            <a href="/" className={s.logo} aria-label="JournalX home">
              <span>Journal<em>X</em></span>
            </a>

            <nav aria-label="Primary" className={s.navLinks}>
              <ul className={s.links}>
                {NAV.map((n) => (
                  <li key={n.label}><a href={n.href}>{n.label}</a></li>
                ))}
              </ul>
            </nav>

            <div className={s.navCta}>
              {loggedIn ? (
                <a href="/dashboard" className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`}>
                  Go to dashboard <ArrowRight size={16} aria-hidden="true" />
                </a>
              ) : (
                <>
                  <a href="/login" className={s.signIn}>Sign in</a>
                  <a href="/register" className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`}>Start free</a>
                </>
              )}
            </div>

            <button
              type="button"
              className={s.burger}
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="lh-mobile-menu"
            >
              {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </button>
          </div>

          <AnimatePresence>
            {open && (
              <motion.div
                id="lh-mobile-menu"
                className={s.mobileMenu}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                {NAV.map((n) => (
                  <a key={n.label} href={n.href} onClick={() => setOpen(false)}>{n.label}</a>
                ))}
                {loggedIn ? (
                  <a href="/dashboard" className={`${s.btn} ${s.btnPrimary}`}>Go to dashboard</a>
                ) : (
                  <>
                    <a href="/login">Sign in</a>
                    <a href="/register" className={`${s.btn} ${s.btnPrimary}`}>Start journaling free</a>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>
    </>
  );
}

/* ---------------- Glass candlestick SVGs ----------------
   Story: a red (losing) candle shatters at the bottom left; a light trail
   rises from the break into a tall green (winning) candle. Journaling turns
   losses into lessons. */

const HUES = {
  green: { hi: "#b6f5da", mid: "#2ebd85", lo: "#0a4d34", side: "#1f9a6c", sideLo: "#052a1c", core: "#7dffc9" },
  red: { hi: "#ffc2cb", mid: "#f6465d", lo: "#6b1220", side: "#d6304a", sideLo: "#3a0810", core: "#ff8a9a" },
};

// zig-zag crack across the body (viewBox coords)
const CRACK = "0,300 34,318 56,286 82,324 104,292 128,316 160,296";
const CLIP_TOP = `0,0 160,0 ${CRACK.split(" ").reverse().join(" ")}`;
const CLIP_BOTTOM = `${CRACK} 160,560 0,560`;

function GlassCandle({ id, hue = "green", part, style }) {
  const c = HUES[hue];
  const g = (n) => `${id}-${n}`;
  const clip = part === "top" ? CLIP_TOP : part === "bottom" ? CLIP_BOTTOM : null;
  return (
    <svg viewBox="0 0 160 560" style={style} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={g("f")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c.hi} stopOpacity="0.75" />
          <stop offset="0.45" stopColor={c.mid} stopOpacity="0.5" />
          <stop offset="1" stopColor={c.lo} stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id={g("s")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.side} stopOpacity="0.8" />
          <stop offset="1" stopColor={c.sideLo} stopOpacity="0.9" />
        </linearGradient>
        <radialGradient id={g("core")} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={c.core} stopOpacity="0.9" />
          <stop offset="1" stopColor={c.core} stopOpacity="0" />
        </radialGradient>
        {clip && (
          <clipPath id={g("clip")}>
            <polygon points={clip} />
          </clipPath>
        )}
      </defs>
      <g clipPath={clip ? `url(#${g("clip")})` : undefined}>
        {/* upper wick */}
        <polygon points="74,8 86,8 86,124 74,124" fill={`url(#${g("f")})`} />
        <polygon points="86,8 92,3 92,112 86,124" fill={`url(#${g("s")})`} />
        {/* body */}
        <polygon points="30,120 120,120 120,452 30,452" fill={`url(#${g("f")})`} />
        <polygon points="120,120 140,104 140,436 120,452" fill={`url(#${g("s")})`} />
        <polygon points="30,120 50,104 140,104 120,120" fill={c.hi} opacity="0.8" />
        {/* lower wick */}
        <polygon points="74,452 86,452 86,552 74,552" fill={`url(#${g("f")})`} />
        <polygon points="86,452 92,446 92,546 86,552" fill={`url(#${g("s")})`} />
        {/* inner light */}
        <ellipse cx="76" cy="270" rx="44" ry="120" fill={`url(#${g("core")})`} style={{ mixBlendMode: "screen" }} />
        {/* specular streaks */}
        <rect x="40" y="132" width="7" height="306" rx="3" fill="#fff" opacity="0.5" />
        <rect x="128" y="118" width="3" height="300" fill="#fff" opacity="0.35" />
        {/* edges */}
        <g fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="1.1">
          <polyline points="30,452 30,120 50,104 140,104 140,436 120,452 30,452" />
          <polyline points="30,120 120,120 120,452" />
          <polyline points="140,104 120,120" />
          <polyline points="74,120 74,8 92,3 92,104" />
          <polyline points="74,452 74,552 86,552 92,546 92,452" />
        </g>
        {clip && <polyline points={CRACK} fill="none" stroke="#fff" strokeOpacity="0.9" strokeWidth="1.6" />}
      </g>
    </svg>
  );
}

function Shard({ color, style, d = "M0,0 L14,4 L6,18 Z" }) {
  return (
    <svg viewBox="0 0 16 20" style={style} aria-hidden="true" focusable="false">
      <path d={d} fill={color} fillOpacity="0.75" stroke="#fff" strokeOpacity="0.7" strokeWidth="0.6" />
    </svg>
  );
}

/* Floating wrapper: gentle bob. Static when reduced motion is on. */
function Float({ children, amp = 12, dur = 7, delay = 0, rotate = 0, reduced }) {
  if (reduced) return <div style={{ width: "100%", height: "100%", transform: `rotate(${rotate}deg)` }}>{children}</div>;
  return (
    <motion.div
      animate={{ y: [0, -amp, 0], rotate: [rotate, rotate + 1.2, rotate] }}
      transition={{ duration: dur, delay, repeat: Infinity, ease: "easeInOut" }}
      style={{ width: "100%", height: "100%" }}
    >
      {children}
    </motion.div>
  );
}

/* sampled cubic bezier from the break (bottom left) to the green candle base */
const EMBER_P = [[92, 362], [170, 380], [232, 320], [262, 222]];
const EMBER_D = `M${EMBER_P[0]} C${EMBER_P[1]} ${EMBER_P[2]} ${EMBER_P[3]}`;
const EMBER_PTS = Array.from({ length: 10 }, (_, k) => {
  const u = k / 9;
  const b = (a) => (1 - u) ** 3 * EMBER_P[0][a] + 3 * (1 - u) ** 2 * u * EMBER_P[1][a] + 3 * (1 - u) * u * u * EMBER_P[2][a] + u ** 3 * EMBER_P[3][a];
  return [Math.round(b(0) * 10) / 10, Math.round(b(1) * 10) / 10];
});
const EMBER_COLORS = ["#f6465d", "#f6465d", "#ff7a6b", "#ffab5e", "#fcd535", "#fcd535", "#c6e36a", "#7fdc9a", "#2ebd85", "#2ebd85"];

/* Hover/tap target for a candle: lifts and brightens when active. */
function Hot({ k, hot, setHot, reduced, children }) {
  const active = hot === k;
  const dim = hot && !active;
  return (
    <motion.div
      style={{ width: "100%", height: "100%", pointerEvents: "auto", cursor: "pointer", position: "relative" }}
      onPointerEnter={(e) => { if (e.pointerType === "mouse") setHot(k); }}
      onPointerLeave={(e) => { if (e.pointerType === "mouse") setHot(null); }}
      onClick={() => setHot(active ? null : k)}
      animate={reduced ? undefined : { scale: active ? 1.06 : 1, opacity: dim ? 0.45 : 1, filter: active ? "brightness(1.3) saturate(1.15)" : "brightness(1) saturate(1)" }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
    >
      {children}
    </motion.div>
  );
}

const TIPS = {
  g: { pos: { right: "42%", top: "6%" }, tone: "green", tag: "Winning setup", title: "Breakout, A+ setup", value: "+$1,312.50", meta: "+2.1R · Followed plan" },
  g2: { pos: { right: "15%", top: "26%" }, tone: "green", tag: "Recovered", title: "VWAP reclaim", value: "+$884.20", meta: "+1.6R · Calm" },
  r: { pos: { left: "0%", top: "14%" }, tone: "red", tag: "Leak found", title: "Revenge trade", value: "-$420.00", meta: "After 2 losses · Tagged: tilt" },
};

/* deterministic ambient star field (no Math.random => no hydration mismatch) */
const AMBIENT = Array.from({ length: 18 }, (_, i) => ({
  x: (i * 53) % 100,
  y: (i * 37 + 11) % 100,
  s: 2 + (i % 3),
  d: 7 + (i % 5) * 1.6,
  delay: -((i * 1.3) % 9),
}));

function Crystals({ heroRef }) {
  const reduced = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 50, damping: 18, mass: 0.6 });
  const sy = useSpring(my, { stiffness: 50, damping: 18, mass: 0.6 });

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const scrollFar = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const scrollNear = useTransform(scrollYProgress, [0, 1], [0, -40]);

  const farX = useTransform(sx, (v) => v * 26);
  const farY = useTransform(sy, (v) => v * 18);
  const nearX = useTransform(sx, (v) => v * -14);
  const nearY = useTransform(sy, (v) => v * -10);
  const shardX = useTransform(sx, (v) => v * 40);
  const shardY = useTransform(sy, (v) => v * 28);

  const visRef = useRef(null);
  const gx = useMotionValue(-999);
  const gy = useMotionValue(-999);
  const sgx = useSpring(gx, { stiffness: 220, damping: 28 });
  const sgy = useSpring(gy, { stiffness: 220, damping: 28 });
  const [trail, setTrail] = useState([]);
  const lastSpawn = useRef(0);
  const seq = useRef(0);

  useEffect(() => {
    if (reduced) return undefined;
    const el = heroRef.current;
    if (!el) return undefined;
    if (!window.matchMedia("(pointer: fine)").matches) return undefined;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      mx.set((e.clientX - r.left) / r.width - 0.5);
      my.set((e.clientY - r.top) / r.height - 0.5);
      const v = visRef.current && visRef.current.getBoundingClientRect();
      if (!v) return;
      const x = e.clientX - v.left;
      const y = e.clientY - v.top;
      const inside = x >= 0 && y >= 0 && x <= v.width && y <= v.height;
      if (!inside) { gx.set(-999); gy.set(-999); return; }
      gx.set(x); gy.set(y);
      const now = performance.now();
      if (now - lastSpawn.current < 45) return;
      lastSpawn.current = now;
      const id = ++seq.current;
      const colors = ["#fcd535", "#ffffff", "#2ebd85", "#ffe8a3"];
      const p = { id, x, y, c: colors[id % colors.length], s: 6 + (id % 4) * 3, dx: ((id * 37) % 40) - 20, rot: (id * 53) % 180 };
      setTrail((tr) => [...tr.slice(-22), p]);
      setTimeout(() => setTrail((tr) => tr.filter((q) => q.id !== id)), 950);
    };
    const onLeave = () => { mx.set(0); my.set(0); gx.set(-999); gy.set(-999); };
    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [heroRef, mx, my, gx, gy, reduced]);

  const p = (x, y) => (reduced ? {} : { x, y });
  const [hot, setHot] = useState(null);
  const [touched, setTouched] = useState(false);
  useEffect(() => { if (hot) setTouched(true); }, [hot]);
  const glow = useTransform([sgx, sgy], ([x, y]) => `radial-gradient(220px circle at ${x + 200}px ${y + 200}px, rgba(252,213,53,0.22), rgba(252,213,53,0.06) 45%, rgba(252,213,53,0) 70%)`);

  return (
    <div className={s.visual} aria-hidden="true" ref={visRef}>
      {/* halos */}
      <div className={s.layer} style={{ right: "6%", top: "0%", width: "60%", height: "90%", background: "radial-gradient(closest-side, rgba(46,189,133,0.22), rgba(46,189,133,0.06) 55%, rgba(0,0,0,0) 100%)", filter: "blur(10px)" }} />
      <div className={s.layer} style={{ left: "4%", bottom: "6%", width: "40%", height: "40%", background: "radial-gradient(closest-side, rgba(246,70,93,0.2), rgba(0,0,0,0) 100%)", filter: "blur(10px)" }} />

      {/* cursor spotlight */}
      {!reduced && <motion.div className={s.layer} style={{ inset: -200, background: glow }} />}

      {/* ambient drifting stars */}
      <div className={s.layer} style={{ inset: 0, overflow: "hidden" }}>
        {AMBIENT.map((st, i) => (
          <span key={i} className={s.drift} style={{ left: `${st.x}%`, top: `${st.y}%`, width: st.s, height: st.s, animationDuration: `${st.d}s`, animationDelay: `${st.delay}s` }} />
        ))}
      </div>

      {/* cursor star trail */}
      {!reduced && trail.map((q) => (
        <span
          key={q.id}
          className={s.trailStar}
          style={{ left: q.x, top: q.y, width: q.s, height: q.s, "--c": q.c, "--dx": `${q.dx}px`, "--rot": `${q.rot}deg` }}
        />
      ))}

      {/* rebirth: embers rise from the break and become the green candle */}
      <svg className={s.layer} viewBox="0 0 400 500" preserveAspectRatio="none" style={{ inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
        <defs>
          <linearGradient id="lh-ribbon" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#f6465d" />
            <stop offset="0.5" stopColor="#fcd535" />
            <stop offset="1" stopColor="#2ebd85" />
          </linearGradient>
          <radialGradient id="lh-burst" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffd27a" stopOpacity="0.9" />
            <stop offset="0.4" stopColor="#f6465d" stopOpacity="0.35" />
            <stop offset="1" stopColor="#f6465d" stopOpacity="0" />
          </radialGradient>
          <filter id="lh-soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        {/* faint energy ribbon (blurred, no hard line) */}
        <path d={EMBER_D} fill="none" stroke="url(#lh-ribbon)" strokeWidth="10" strokeLinecap="round" opacity="0.22" filter="url(#lh-soft)" />
        {/* pulse at the crack */}
        <motion.ellipse
          cx={EMBER_PTS[0][0]} cy={EMBER_PTS[0][1]} rx="34" ry="34" fill="url(#lh-burst)"
          style={{ transformOrigin: `${EMBER_PTS[0][0]}px ${EMBER_PTS[0][1]}px` }}
          animate={reduced ? undefined : { scale: [0.8, 1.25, 0.8], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* embers */}
        {reduced
          ? EMBER_PTS.filter((_, i) => i % 3 === 1).map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="2.4" fill={EMBER_COLORS[i * 3 + 1]} opacity="0.85" />
            ))
          : Array.from({ length: 9 }).map((_, i) => (
              <motion.circle
                key={i}
                r={i % 3 === 0 ? 3.2 : 2.2}
                initial={{ cx: EMBER_PTS[0][0], cy: EMBER_PTS[0][1], opacity: 0 }}
                animate={{
                  cx: EMBER_PTS.map((q, k) => q[0] + Math.sin(k + i) * (i % 2 ? 6 : -6)),
                  cy: EMBER_PTS.map((q) => q[1]),
                  fill: EMBER_COLORS,
                  opacity: EMBER_PTS.map((_, k) => (k === 0 ? 0 : k > EMBER_PTS.length - 3 ? 0.2 : 1)),
                }}
                transition={{ duration: 3.4, delay: i * 0.38, repeat: Infinity, ease: "easeIn" }}
                style={{ filter: "drop-shadow(0 0 4px rgba(252,213,53,0.9))" }}
              />
            ))}
      </svg>

      {/* main green candle (far layer) */}
      <motion.div
        className={s.layer}
        style={{ right: "16%", top: "-2%", width: "24%", height: "98%", ...p(farX, farY) }}
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.div style={{ width: "100%", height: "100%", y: reduced ? 0 : scrollFar }}>
          <Float amp={14} dur={8} rotate={8} reduced={reduced}>
            <Hot k="g" hot={hot} setHot={setHot} reduced={reduced}>
              <GlassCandle id="lh-g" hue="green" style={{ width: "100%", height: "100%", filter: hot === "g" ? "drop-shadow(0 0 46px rgba(46,189,133,0.8))" : "drop-shadow(0 0 28px rgba(46,189,133,0.45))", transition: "filter .3s" }} />
            </Hot>
          </Float>
        </motion.div>
      </motion.div>

      {/* smaller green candle */}
      <motion.div
        className={s.layer}
        style={{ right: "1%", top: "36%", width: "12%", height: "48%", ...p(farX, farY) }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.85 }}
        transition={{ duration: 1, delay: 0.35 }}
      >
        <Float amp={9} dur={9} delay={1.2} rotate={-6} reduced={reduced}>
          <Hot k="g2" hot={hot} setHot={setHot} reduced={reduced}>
            <GlassCandle id="lh-g2" hue="green" style={{ width: "100%", height: "100%", filter: hot === "g2" ? "drop-shadow(0 0 30px rgba(46,189,133,0.75))" : "none", transition: "filter .3s" }} />
          </Hot>
        </Float>
      </motion.div>

      {/* broken red candle: one candle snapped at the crack, halves just apart */}
      <motion.div
        className={s.layer}
        style={{ left: "13%", bottom: "2%", width: "13%", height: "50%", ...p(nearX, nearY) }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <motion.div style={{ width: "100%", height: "100%", y: reduced ? 0 : scrollNear }}>
          <Float amp={5} dur={9} rotate={-26} reduced={reduced}>
            <Hot k="r" hot={hot} setHot={setHot} reduced={reduced}>
            <div style={{ position: "relative", width: "100%", height: "100%" }}>
              {/* light leaking from the crack */}
              <motion.div
                style={{ position: "absolute", left: "-30%", top: "40%", width: "160%", height: "26%", borderRadius: "50%", background: "radial-gradient(closest-side, rgba(255,214,120,0.95), rgba(246,70,93,0.45) 45%, rgba(246,70,93,0) 100%)", filter: "blur(8px)" }}
                animate={reduced ? undefined : { opacity: [0.55, 1, 0.55], scaleX: [0.9, 1.1, 0.9] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              />
              <GlassCandle id="lh-r1" hue="red" part="bottom" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", filter: "drop-shadow(0 0 16px rgba(246,70,93,0.4))" }} />
              <motion.div
                style={{ position: "absolute", inset: 0, transformOrigin: "50% 54%" }}
                initial={false}
                animate={reduced ? { x: -6, y: -16, rotate: -9 } : { x: [-4, -8, -4], y: [-12, -20, -12], rotate: [-7, -11, -7] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              >
                <GlassCandle id="lh-r2" hue="red" part="top" style={{ width: "100%", height: "100%", filter: "drop-shadow(0 0 16px rgba(246,70,93,0.35))" }} />
              </motion.div>
            </div>
            </Hot>
          </Float>
        </motion.div>
      </motion.div>

      {/* shards bursting from the crack */}
      {[
        { left: "25%", bottom: "30%", w: 13, r: 20, c: "#f6465d", dur: 4.5 },
        { left: "29%", bottom: "36%", w: 9, r: -30, c: "#ff8a9a", dur: 5.2 },
        { left: "21%", bottom: "38%", w: 8, r: 60, c: "#f6465d", dur: 6 },
        { left: "33%", bottom: "28%", w: 7, r: 10, c: "#fcd535", dur: 4.8 },
        { left: "18%", bottom: "26%", w: 6, r: -15, c: "#ff8a9a", dur: 5.6 },
      ].map((sh, i) => (
        <motion.div key={i} className={s.layer} style={{ left: sh.left, bottom: sh.bottom, width: sh.w, height: sh.w * 1.25, ...p(shardX, shardY) }}>
          <motion.div
            style={{ width: "100%", height: "100%", rotate: sh.r }}
            animate={reduced ? undefined : { y: [0, -10, 0], x: [0, i % 2 ? 6 : -6, 0], rotate: [sh.r, sh.r + 50, sh.r] }}
            transition={{ duration: sh.dur, repeat: Infinity, ease: "easeInOut", delay: i * 0.35 }}
          >
            <Shard color={sh.c} style={{ width: "100%", height: "100%" }} />
          </motion.div>
        </motion.div>
      ))}

      {/* hover tooltips */}
      <AnimatePresence>
        {hot && TIPS[hot] && (
          <motion.div
            key={hot}
            className={`${s.tip} ${TIPS[hot].tone === "red" ? s.tipRed : s.tipGreen}`}
            style={TIPS[hot].pos}
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.2 }}
          >
            <span className={s.tipTag}>{TIPS[hot].tag}</span>
            <b className={s.tipTitle}>{TIPS[hot].title}</b>
            <span className={s.tipValue}>{TIPS[hot].value}</span>
            <span className={s.tipMeta}>{TIPS[hot].meta}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <span className={`${s.hint} ${touched ? s.hintGone : ""}`}>Hover the candles</span>

      {/* glints */}
      <span className={`${s.sparkle} ${s.sparkleGold}`} style={{ right: "30%", top: "4%" }} />
      <span className={s.sparkle} style={{ right: "8%", top: "32%", animationDelay: "1.1s" }} />
      <span className={`${s.sparkle} ${s.sparkleGold}`} style={{ left: "48%", top: "52%", animationDelay: "0.6s" }} />
    </div>
  );
}


/* ---------------- Hero ---------------- */
export default function LightHero() {
  const heroRef = useRef(null);

  return (
    <section ref={heroRef} className={`${s.lx} ${s.hero}`} aria-labelledby="hero-title">
      <div className={s.sky} aria-hidden="true">
        <div className={s.grid} />
        <div className={s.beam} />
        <div className={s.cloud} style={{ left: "-10%", bottom: "8%", width: "55%", height: "40%" }} />
        <div className={s.cloud} style={{ right: "-8%", top: "10%", width: "50%", height: "45%" }} />
        <div className={s.cloud} style={{ right: "20%", bottom: "-10%", width: "60%", height: "35%" }} />
      </div>

      <div className={`${s.wrap} ${s.heroInner}`}>
        <div className={s.copy}>
          <h1 id="hero-title" className={s.title}>
            <span>The trading journal</span>{" "}
            <span className={s.titleAccent}>that finds your edge</span>
          </h1>
          <p className={s.lead}>
            Log a trade in seconds and see exactly what is working: win rate, R-multiple, drawdown and
            trading psychology across stocks, options, futures, forex and crypto, for your own account or a
            funded one.
          </p>
          <div className={s.actions}>
            <a href="/register" className={`${s.btn} ${s.btnPrimary} ${s.btnLg}`}>
              Start journaling free <ArrowRight size={18} aria-hidden="true" />
            </a>
            <a href="/dashboard" className={`${s.btn} ${s.btnOutline}`}>Try the demo</a>
          </div>
        </div>

        <Crystals heroRef={heroRef} />
      </div>

      <div className={s.wrap}>
        <div className={s.stats}>
          <ul className={s.statList} aria-label="JournalX in numbers">
            {STATS.map(({ value, label, Icon }) => (
              <li key={label} className={s.stat}>
                <span className={s.statIcon} aria-hidden="true"><Icon size={20} strokeWidth={1.8} /></span>
                <span>
                  <strong className={s.statValue}>{value}</strong>
                  <span className={s.statLabel}>{label}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className={s.badges}>
            <div className={s.badge} aria-label={`Rated ${RATING.value} out of ${RATING.outOf}`}>
              <span className={s.badgeTitle}>{RATING.value} / {RATING.outOf}</span>
              <span className={s.badgeMeta}>
                <span className={s.stars} aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={15} fill="currentColor" strokeWidth={0} />)}
                </span>
                <span className={s.badgeSep} aria-hidden="true" />
                {RATING.source}
              </span>
            </div>
            <div className={s.badge}>
              <span className={s.badgeTitle}>Free plan</span>
              <span className={s.badgeMeta}><span>No card required</span><span className={s.badgeSep} aria-hidden="true" /><span>7-day paid trial</span></span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
