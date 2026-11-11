"use client";

/* JournalX feature bento — 12-col asymmetric grid on black. Each card RUNS a
   looping demo (not a description) and carries visible, keyword-rich copy:
   Trade logging · Trading analytics · Auto-import · Trading psychology ·
   Drawdown alerts · P&L calendar · Every market.
   - Cursor spotlight + accent glow per card; lifts on hover.
   - Loops pause off-screen (IntersectionObserver) and freeze on a legible
     frame under prefers-reduced-motion.
   - All copy is server-rendered; an ItemList JSON-LD mirrors the cards.
   Semantic colour only: green profit, red loss, amber warning, gold = brand. */

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CalendarDays,
  Globe2,
  NotebookPen,
  ShieldAlert,
  UploadCloud,
} from "lucide-react";
import Eyebrow from "@/components/landing/Eyebrow";

const GREEN = "#2ebd85", RED = "#f6465d", AMBER = "#f0b90b", GOLD = "#fcd535", SILVER = "#c7ccd4";
const SITE_URL = "https://journalx.app";

function useInView(threshold = 0.2) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setInView(true); return; }
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, inView];
}

/* ── Log: a quick-log fills itself in ── */
function LogDemo({ on }) {
  const reduce = useReducedMotion();
  const sym = "EURUSD";
  const [typed, setTyped] = useState("");
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    if (reduce) { setTyped(sym); setFilled(true); return undefined; }
    if (!on) return undefined;
    let i = 0;
    let typer;
    const run = () => {
      i = 0; setTyped(""); setFilled(false);
      clearInterval(typer);
      typer = setInterval(() => {
        i += 1; setTyped(sym.slice(0, i));
        if (i >= sym.length) { clearInterval(typer); setTimeout(() => setFilled(true), 350); }
      }, 120);
    };
    run();
    const loop = setInterval(run, 5600);
    return () => { clearInterval(typer); clearInterval(loop); };
  }, [on, reduce]);
  const Row = ({ k, v, c, show }) => (
    <div className="bd-row"><span className="bd-k">{k}</span><span className="bd-v" style={{ color: c, opacity: show ? 1 : 0.25, transition: "opacity .35s" }}>{show ? v : "—"}</span></div>
  );
  return (
    <div className="bd-demo" aria-hidden="true">
      <div className="bd-row bd-row--focus"><span className="bd-k">Symbol</span><span className="bd-v">{typed}<span className="bd-caret" /></span></div>
      <div className="bd-row2">
        <Row k="Entry" v="1.0842" show={filled} />
        <Row k="Exit" v="1.0918" show={filled} />
      </div>
      <Row k="Result" v="+2.1R · +$684" c={GREEN} show={filled} />
      <div className="bd-tags">
        <span className="bd-tag" data-on={filled ? "true" : "false"}>Followed plan</span>
        <span className="bd-tag" data-on={filled ? "true" : "false"} style={{ transitionDelay: "120ms" }}>Calm</span>
        <span className="bd-tag" data-on={filled ? "true" : "false"} style={{ transitionDelay: "240ms" }}>London open</span>
      </div>
    </div>
  );
}

/* ── Analytics: equity curve draws + KPIs + one insight ── */
function AnalyticsDemo() {
  const reduce = useReducedMotion();
  const [ref, inView] = useInView(0.3);
  const d = "M0,86 L26,78 L52,82 L78,62 L104,66 L130,48 L156,54 L182,36 L208,26 L234,30 L260,14";
  const draw = inView && !reduce;
  return (
    <div className="bd-demo" ref={ref} aria-hidden="true">
      <div className="bd-kpis">
        <div><span>Win rate</span><b>58%</b></div>
        <div><span>Profit factor</span><b>1.9</b></div>
        <div><span>Avg R</span><b style={{ color: GREEN }}>+0.8R</b></div>
        <div><span>Max DD</span><b style={{ color: RED }}>-4.2%</b></div>
      </div>
      <svg viewBox="0 0 260 100" preserveAspectRatio="none" className="bd-eq">
        <defs><linearGradient id="bdEq" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={GREEN} stopOpacity="0.25" /><stop offset="1" stopColor={GREEN} stopOpacity="0" /></linearGradient></defs>
        {[25, 50, 75].map((y) => <line key={y} x1="0" x2="260" y1={y} y2={y} stroke="#1c1c1c" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
        <path d={`${d} L260,100 L0,100 Z`} fill="url(#bdEq)" />
        <path d={d} fill="none" stroke={GREEN} strokeWidth="1.8" vectorEffect="non-scaling-stroke" key={draw ? "a" : "s"} className={draw ? "bd-eqline" : ""} />
      </svg>
      <div className="bd-insight"><span className="bd-dot" style={{ background: AMBER }} />Win rate drops <b>22%</b> on trades after 2pm</div>
    </div>
  );
}

/* ── Auto-import: terminal rows flip to done ── */
const ROWS = ["Connect broker / exchange", "Fetch fills · 28 days", "Pair round-trips", "Skip duplicates"];
function ImportDemo({ on }) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (reduce) { setStep(ROWS.length + 2); return undefined; }
    if (!on) return undefined;
    setStep(0);
    const t = setInterval(() => setStep((s) => (s >= ROWS.length + 2 ? 0 : s + 1)), 950);
    return () => clearInterval(t);
  }, [on, reduce]);
  const stFor = (i) => (i < step ? "done" : i === step ? "running" : "queued");
  return (
    <div className="bd-demo bd-term" aria-hidden="true">
      <div className="bd-bar"><i className="bd-o" style={{ background: RED }} /><i className="bd-o" style={{ background: AMBER }} /><i className="bd-o" style={{ background: GREEN }} /><span>import · binance + csv</span></div>
      <div className="bd-termbody">
        {ROWS.map((r, i) => { const s = stFor(i); return (
          <div className="bd-trow" key={r}><span>{r}</span><span className={`bd-st bd-st--${s}`}>[{s}]</span></div>
        ); })}
        <div className="bd-done">{step > ROWS.length ? "✓ Imported 24 trades · 0 duplicates" : " "}</div>
      </div>
    </div>
  );
}

/* ── Psychology (wide): discipline gauge + tilt cost ── */
function PsychDemo({ on }) {
  const reduce = useReducedMotion();
  const [score, setScore] = useState(0);
  useEffect(() => {
    if (reduce) { setScore(82); return undefined; }
    if (!on) return undefined;
    const run = () => { let v = 0; const t = setInterval(() => { v += 3; if (v >= 82) { v = 82; clearInterval(t); } setScore(v); }, 32); return t; };
    let t = run();
    const loop = setInterval(() => { clearInterval(t); t = run(); }, 5000);
    return () => { clearInterval(t); clearInterval(loop); };
  }, [on, reduce]);
  const r = 44, C = 2 * Math.PI * r, off = C * (1 - score / 100);
  return (
    <div className="bd-demo bd-psych" aria-hidden="true">
      <svg viewBox="0 0 120 120" width="136" height="136" style={{ flex: "0 0 auto" }}>
        <defs>
          <linearGradient id="bdGauge" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={GOLD} /><stop offset="1" stopColor={GREEN} /></linearGradient>
        </defs>
        <circle cx="60" cy="60" r={r} fill="none" stroke="#1c1c1c" strokeWidth="8" />
        <circle cx="60" cy="60" r={r} fill="none" stroke="url(#bdGauge)" strokeWidth="8" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={off} transform="rotate(-90 60 60)" style={{ transition: reduce ? "none" : "stroke-dashoffset .09s linear" }} />
        <text x="60" y="58" textAnchor="middle" fill="#fff" style={{ font: "300 30px Poppins" }}>{score}</text>
        <text x="60" y="76" textAnchor="middle" fill="#7a7a7a" style={{ font: "500 9px Poppins", letterSpacing: "0.08em" }}>DISCIPLINE</text>
      </svg>
      <div className="bd-pside">
        <div className="bd-pstat"><span>Tilt cost this week</span><b style={{ color: RED }}>-$412</b></div>
        <div className="bd-pstat"><span>Followed plan</span><b style={{ color: GREEN }}>17 / 20 trades</b></div>
        <div className="bd-pstat"><span>Best setup</span><b>Breakout · 71%</b></div>
        <div className="bd-tags">{["FOMO", "Revenge", "Overtrade", "Moved stop"].map((t, k) => <span key={t} className="bd-tag bd-tag--warn" data-on="true" style={{ transitionDelay: `${k * 90}ms` }}>{t}</span>)}</div>
      </div>
    </div>
  );
}

/* ── Drawdown guard: bar reacts toward the limit ── */
function DrawdownDemo({ on }) {
  const reduce = useReducedMotion();
  const [pct, setPct] = useState(20);
  useEffect(() => {
    if (reduce) { setPct(62); return undefined; }
    if (!on) return undefined;
    let up = true, v = 20;
    const t = setInterval(() => { v += up ? 4 : -4; if (v >= 78) up = false; if (v <= 20) up = true; setPct(v); }, 90);
    return () => clearInterval(t);
  }, [on, reduce]);
  const danger = pct > 70;
  return (
    <div className="bd-demo bd-dd" aria-hidden="true">
      <div className="bd-ddhead"><span>Daily drawdown</span><b style={{ color: danger ? RED : "#fff" }}>{((pct / 100) * 5).toFixed(1)}% / 5%</b></div>
      <div className="bd-ddtrack"><div className="bd-ddfill" style={{ width: `${pct}%`, background: danger ? RED : GREEN, transition: reduce ? "none" : "width .09s linear, background .2s" }} /><span className="bd-ddlimit" /></div>
      <div className="bd-ddhead"><span>Trailing drawdown</span><b>2.1% / 10%</b></div>
      <div className="bd-ddtrack"><div className="bd-ddfill" style={{ width: "21%", background: SILVER }} /></div>
      <div className={`bd-ddnote${danger ? " bd-ddnote--on" : ""}`}>
        <ShieldAlert size={14} aria-hidden="true" /> {danger ? "Approaching limit, stop for the day" : "Inside your prop firm rules"}
      </div>
    </div>
  );
}

/* ── P&L calendar: month heatmap fills in ── */
const CAL = [320, -140, 510, 0, 220, 90, -260, 640, 180, 0, -90, 410, 270, -320, 150, 0, 560, 120, -60, 380];
function CalendarDemo({ on }) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (reduce) { setN(CAL.length); return undefined; }
    if (!on) return undefined;
    setN(0);
    const t = setInterval(() => setN((v) => (v >= CAL.length + 8 ? 0 : v + 1)), 180);
    return () => clearInterval(t);
  }, [on, reduce]);
  const shown = CAL.slice(0, Math.min(n, CAL.length));
  const total = shown.reduce((a, b) => a + b, 0);
  return (
    <div className="bd-demo" aria-hidden="true">
      <div className="bd-calhead"><span>November</span><b style={{ color: total >= 0 ? GREEN : RED }}>{total >= 0 ? "+" : "-"}${Math.abs(total).toLocaleString()}</b></div>
      <div className="bd-cal">
        {["M", "T", "W", "T", "F"].map((d, i) => <span key={i} className="bd-calday">{d}</span>)}
        {CAL.map((v, i) => {
          const vis = i < n;
          const a = Math.min(1, Math.abs(v) / 640);
          const bg = !vis || v === 0 ? "#141414" : v > 0 ? `rgba(46,189,133,${0.15 + a * 0.55})` : `rgba(246,70,93,${0.15 + a * 0.55})`;
          return <span key={i} className="bd-calcell" style={{ background: bg, transform: vis ? "scale(1)" : "scale(.85)" }}>{i + 3}</span>;
        })}
      </div>
    </div>
  );
}

/* ── Markets: instruments cycle through asset classes ── */
const MARKETS = [["Stocks", "AAPL · NVDA"], ["Options", "SPY 0DTE"], ["Futures", "ES · NQ · MES"], ["Forex", "EURUSD · XAUUSD"], ["Crypto", "BTC · ETH · SOL"]];
function MarketsDemo({ on }) {
  const reduce = useReducedMotion();
  const [k, setK] = useState(0);
  useEffect(() => {
    if (reduce || !on) return undefined;
    const t = setInterval(() => setK((v) => (v + 1) % MARKETS.length), 1300);
    return () => clearInterval(t);
  }, [on, reduce]);
  return (
    <div className="bd-demo bd-mk" aria-hidden="true">
      {MARKETS.map(([m, ex], i) => (
        <div key={m} className="bd-mkrow" data-on={i === k ? "true" : "false"}>
          <span>{m}</span><em>{ex}</em>
        </div>
      ))}
    </div>
  );
}

/* Cards. `title` is the keyword H3, `desc` is visible SEO copy. */
const CARDS = [
  { id: "log", span: "s5", Icon: NotebookPen, acc: GOLD, kicker: "Trade logging", title: "Log a full trade in seconds", desc: "Quick-log symbol, entry, exit, R-multiple and P&L, then tag your setup and emotions. The fastest way to keep a trading journal you actually stick to.", href: "/features", Demo: LogDemo },
  { id: "analytics", span: "s7", Icon: BarChart3, acc: GREEN, kicker: "Trading analytics", title: "See your real edge in the numbers", desc: "Win rate, profit factor, R-multiple, expectancy and equity curve are computed automatically, with insights like which hours and setups cost you money.", href: "/features", Demo: AnalyticsDemo },
  { id: "import", span: "s4", Icon: UploadCloud, acc: SILVER, kicker: "Auto-import", title: "Trades import themselves", desc: "Connect a supported exchange or upload a CSV from your broker. JournalX pairs round-trips and skips duplicates.", href: "/features", Demo: ImportDemo },
  { id: "psych", span: "s8", Icon: BrainCircuit, acc: GOLD, kicker: "Trading psychology", title: "Know exactly what tilt costs you", desc: "Every trade gets a discipline score. Tag FOMO, revenge trading and moved stops, and JournalX shows the dollar cost of each habit so you can fix it.", href: "/features", Demo: PsychDemo },
  { id: "dd", span: "s4", Icon: ShieldAlert, acc: RED, kicker: "Drawdown alerts", title: "Stay inside prop firm rules", desc: "Track daily and trailing drawdown against your funded account limits for FTMO, Topstep, Apex and other prop firms.", href: "/features", Demo: DrawdownDemo },
  { id: "cal", span: "s4", Icon: CalendarDays, acc: GREEN, kicker: "P&L calendar", title: "Every trading day at a glance", desc: "A colour-coded P&L calendar shows green and red days, streaks and monthly totals for daily and weekly reviews.", href: "/features", Demo: CalendarDemo },
  { id: "mk", span: "s4", Icon: Globe2, acc: SILVER, kicker: "All markets", title: "One journal for every market", desc: "Stocks, options, futures, forex and crypto in any currency, with correct price precision for every instrument.", href: "/features", Demo: MarketsDemo },
];

function Card({ c, i }) {
  const [ref, inView] = useInView(0.15);
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  const { Icon, Demo } = c;
  return (
    <motion.article
      ref={ref}
      id={`feature-${c.id}`}
      className={`bd-card bd-${c.span}`}
      style={{ "--acc": c.acc }}
      onPointerMove={onMove}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, delay: (i % 3) * 0.06, ease: [0.22, 1, 0.36, 1] }}
      aria-labelledby={`feature-${c.id}-title`}
    >
      <div className="bd-top">
        <span className="bd-chip"><Icon size={15} strokeWidth={1.8} aria-hidden="true" /></span>
        <span className="bd-kicker">{c.kicker}</span>
      </div>
      <div className="bd-demowrap"><Demo on={inView} /></div>
      <div className="bd-foot">
        <h3 id={`feature-${c.id}-title`} className="bd-label">{c.title}</h3>
        <p className="bd-desc">{c.desc}</p>
        <a href={c.href} className="bd-explore" aria-label={`Explore ${c.kicker.toLowerCase()} in the JournalX trading journal`}>
          Explore {c.kicker.toLowerCase()} <ArrowRight size={13} aria-hidden="true" />
        </a>
      </div>
    </motion.article>
  );
}

export default function BentoGrid() {
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "JournalX trading journal features",
    itemListElement: CARDS.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${c.kicker}: ${c.title}`,
      description: c.desc,
      url: `${SITE_URL}/#feature-${c.id}`,
    })),
  };

  return (
    <section id="trading-journal-features" className="bd" aria-labelledby="bd-title">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <div className="bd-inner">
        <div className="bd-head">
          <Eyebrow>Trading journal features</Eyebrow>
          <h2 id="bd-title" className="bd-h2">Everything a trading journal needs to <span>find your edge</span></h2>
          <p className="bd-lead">
            Log trades in seconds, auto-import from your broker or exchange, and get trading analytics, psychology
            tracking, a P&amp;L calendar and drawdown alerts in one trading journal built for funded and prop firm traders.
          </p>
        </div>
        <div className="bd-grid">
          {CARDS.map((c, i) => <Card key={c.id} c={c} i={i} />)}
        </div>
        <div className="bd-cta">
          <a href="/register" className="bd-btn">Start your trading journal free <ArrowRight size={15} aria-hidden="true" /></a>
          <a href="/features" className="bd-link">See every feature</a>
        </div>
      </div>

      <style jsx global>{`
        .bd{background:#000;padding:104px 24px 96px;font-family:Poppins,sans-serif;position:relative;}
        .bd::before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(50% 30% at 50% 0%,rgba(252,213,53,0.05),rgba(0,0,0,0) 70%);}
        .bd-inner{max-width:1200px;margin:0 auto;position:relative;}
        .bd-head{text-align:center;max-width:760px;margin:0 auto 48px;display:flex;flex-direction:column;align-items:center;}
        .bd-h2{font:600 clamp(28px,3.6vw,46px)/1.1 Poppins;letter-spacing:-0.03em;color:#fff;margin:0;text-wrap:balance;}
        .bd-h2 span{background:linear-gradient(180deg,#f2f4f6,#8b929c);-webkit-background-clip:text;background-clip:text;color:transparent;}
        .bd-lead{font:400 clamp(15px,1.4vw,17px)/1.65 Poppins;color:#9aa1ad;margin:16px auto 0;max-width:640px;}

        .bd-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:16px;}
        .bd-s4{grid-column:span 4;} .bd-s5{grid-column:span 5;} .bd-s7{grid-column:span 7;} .bd-s8{grid-column:span 8;}

        .bd-card{position:relative;display:flex;flex-direction:column;background:linear-gradient(180deg,#0f0f11,#0a0a0b);border:1px solid #1c1c1c;border-radius:22px;overflow:hidden;box-shadow:inset 0 1px 0 rgba(255,255,255,0.05);transition:border-color .25s,transform .25s,box-shadow .25s;isolation:isolate;}
        .bd-card::before{content:"";position:absolute;inset:0;z-index:-1;background:radial-gradient(70% 60% at 100% 0%,color-mix(in srgb,var(--acc) 10%,transparent),transparent 70%);}
        .bd-card::after{content:"";position:absolute;inset:0;z-index:-1;opacity:0;transition:opacity .3s;background:radial-gradient(320px circle at var(--mx,50%) var(--my,50%),rgba(255,255,255,0.06),transparent 60%);}
        .bd-card:hover{border-color:#2c2c2c;transform:translateY(-3px);box-shadow:inset 0 1px 0 rgba(255,255,255,0.06),0 24px 50px -30px rgba(0,0,0,0.9),0 0 0 1px color-mix(in srgb,var(--acc) 14%,transparent);}
        .bd-card:hover::after{opacity:1;}

        .bd-top{display:flex;align-items:center;gap:10px;padding:18px 20px 0;}
        .bd-chip{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;color:var(--acc);background:color-mix(in srgb,var(--acc) 12%,#101012);border:1px solid color-mix(in srgb,var(--acc) 22%,#1c1c1c);}
        .bd-kicker{font:600 11px Poppins;letter-spacing:.12em;text-transform:uppercase;color:#8b929c;}

        .bd-demowrap{flex:1;min-height:200px;padding:16px 20px 18px;overflow:hidden;}
        .bd-foot{padding:18px 20px 20px;border-top:1px solid #18181a;display:flex;flex-direction:column;gap:6px;}
        .bd-label{font:600 18px/1.3 Poppins;letter-spacing:-0.01em;color:#fff;margin:0;}
        .bd-desc{font:400 13.5px/1.6 Poppins;color:#8f96a1;margin:0;}
        .bd-explore{align-self:flex-start;margin-top:6px;display:inline-flex;align-items:center;gap:6px;font:500 13px Poppins;color:#c7ccd4;text-decoration:none;transition:color .2s,gap .2s;}
        .bd-card:hover .bd-explore{color:var(--acc);gap:9px;}
        .bd-explore:focus-visible{outline:2px solid ${GOLD};outline-offset:3px;border-radius:4px;}

        .bd-demo{display:flex;flex-direction:column;gap:9px;height:100%;}
        .bd-row{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#141416;border:1px solid #1e1e20;border-radius:11px;min-width:0;}
        .bd-row--focus{border-color:color-mix(in srgb,${GOLD} 35%,#1e1e20);box-shadow:0 0 0 3px rgba(252,213,53,0.06);}
        .bd-row2{display:grid;grid-template-columns:1fr 1fr;gap:9px;}
        .bd-k{font:500 11.5px Poppins;color:#7a7a7a;letter-spacing:.02em;}
        .bd-v{font:500 13.5px Poppins;color:#fff;display:inline-flex;align-items:center;white-space:nowrap;}
        .bd-caret{display:inline-block;width:2px;height:1em;margin-left:2px;background:${GOLD};animation:bdBlink 1s steps(1) infinite;}
        @keyframes bdBlink{50%{opacity:0;}}
        .bd-tags{display:flex;gap:8px;margin-top:2px;flex-wrap:wrap;}
        .bd-tag{font:500 11.5px Poppins;color:#7a7a7a;border:1px solid #222;border-radius:999px;padding:5px 11px;opacity:0;transform:translateY(4px);transition:opacity .3s,transform .3s;}
        .bd-tag[data-on="true"]{opacity:1;transform:none;color:#c7ccd3;border-color:#2a2a2a;}
        .bd-tag--warn[data-on="true"]{color:#f3a3ae;border-color:rgba(246,70,93,0.28);background:rgba(246,70,93,0.06);}

        .bd-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;}
        .bd-kpis div{background:#141416;border:1px solid #1e1e20;border-radius:11px;padding:9px 11px;min-width:0;}
        .bd-kpis span{display:block;font:500 10.5px Poppins;color:#7a7a7a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .bd-kpis b{font:600 16px Poppins;color:#fff;letter-spacing:-0.02em;}
        .bd-eq{width:100%;height:110px;display:block;}
        .bd-insight{display:flex;align-items:center;gap:8px;font:400 13px Poppins;color:#c7ccd3;background:#141416;border:1px solid #1e1e20;border-radius:11px;padding:10px 12px;margin-top:auto;}
        .bd-insight b{color:#fff;}
        .bd-dot{width:7px;height:7px;border-radius:50%;flex:0 0 auto;box-shadow:0 0 8px currentColor;}
        .bd-eqline{stroke-dasharray:600;stroke-dashoffset:600;animation:bdDraw 2.2s cubic-bezier(0.22,1,0.36,1) forwards;}
        @keyframes bdDraw{to{stroke-dashoffset:0;}}

        .bd-term{font-family:"SFMono-Regular",ui-monospace,Menlo,monospace;background:#111113;border:1px solid #1e1e20;border-radius:12px;overflow:hidden;gap:0;}
        .bd-bar{display:flex;align-items:center;gap:6px;padding:9px 11px;border-bottom:1px solid #1e1e20;}
        .bd-o{width:10px;height:10px;border-radius:50%;}
        .bd-bar span{margin-left:8px;font:500 11.5px Poppins;color:#7a7a7a;}
        .bd-termbody{padding:13px;display:flex;flex-direction:column;gap:9px;}
        .bd-trow{display:flex;justify-content:space-between;gap:10px;font-size:12px;color:#9b9b9b;}
        .bd-trow span:first-child{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .bd-st--done{color:${GREEN};}.bd-st--running{color:${AMBER};}.bd-st--queued{color:#5a5a5a;}
        .bd-done{font:600 12px Poppins;color:${GREEN};min-height:16px;margin-top:2px;}

        .bd-psych{flex-direction:row;align-items:center;gap:26px;}
        .bd-pside{display:flex;flex-direction:column;gap:11px;flex:1;min-width:0;}
        .bd-pstat{display:flex;justify-content:space-between;align-items:center;gap:10px;font:400 13px Poppins;color:#9b9b9b;border-bottom:1px solid #1a1a1a;padding-bottom:10px;}
        .bd-pstat b{color:#fff;font-weight:500;white-space:nowrap;}

        .bd-dd{justify-content:center;gap:10px;}
        .bd-ddhead{display:flex;justify-content:space-between;font:500 12.5px Poppins;color:#9b9b9b;}
        .bd-ddhead b{font-weight:600;}
        .bd-ddtrack{position:relative;height:10px;border-radius:999px;background:#141416;border:1px solid #1e1e20;overflow:hidden;}
        .bd-ddfill{height:100%;border-radius:999px;}
        .bd-ddlimit{position:absolute;right:30%;top:0;bottom:0;width:1px;background:rgba(255,255,255,0.25);}
        .bd-ddnote{display:flex;align-items:center;gap:7px;font:500 12px Poppins;color:#8b929c;margin-top:4px;padding:8px 10px;border-radius:10px;background:#121214;border:1px solid #1e1e20;transition:all .2s;}
        .bd-ddnote--on{color:#ffb3bd;border-color:rgba(246,70,93,0.35);background:rgba(246,70,93,0.08);}

        .bd-calhead{display:flex;justify-content:space-between;font:500 12.5px Poppins;color:#9b9b9b;}
        .bd-calhead b{font-weight:600;}
        .bd-cal{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;}
        .bd-calday{font:500 10px Poppins;color:#5f6670;text-align:center;}
        .bd-calcell{aspect-ratio:1.5/1;border-radius:7px;font:500 10px Poppins;color:rgba(255,255,255,0.55);display:flex;align-items:flex-start;justify-content:flex-end;padding:4px 6px;box-sizing:border-box;border:1px solid rgba(255,255,255,0.03);transition:background .3s,transform .3s;}

        .bd-mk{gap:7px;}
        .bd-mkrow{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 12px;border-radius:11px;background:#141416;border:1px solid #1e1e20;font:500 13px Poppins;color:#c7ccd4;transition:all .3s;}
        .bd-mkrow em{font:400 11.5px Poppins;font-style:normal;color:#6f7785;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .bd-mkrow[data-on="true"]{border-color:rgba(252,213,53,0.35);background:rgba(252,213,53,0.06);color:#fff;transform:translateX(4px);}
        .bd-mkrow[data-on="true"] em{color:#c7ccd4;}

        .bd-cta{display:flex;justify-content:center;align-items:center;gap:22px;margin-top:40px;flex-wrap:wrap;}
        .bd-btn{display:inline-flex;align-items:center;gap:8px;padding:13px 22px;border-radius:12px;background:${GOLD};color:#181a20;font:600 15px Poppins;text-decoration:none;transition:background .2s;}
        .bd-btn:hover{background:${AMBER};}
        .bd-link{font:500 14px Poppins;color:#c7ccd4;text-decoration:none;border-bottom:1px solid #333;padding-bottom:2px;}
        .bd-link:hover{color:#fff;border-color:#fff;}

        @media (max-width:1100px){
          .bd-s4,.bd-s5,.bd-s7,.bd-s8{grid-column:span 6;}
          .bd-card#feature-psych{grid-column:1 / -1;}
        }
        @media (max-width:760px){
          .bd{padding:72px 16px 64px;}
          .bd-head{margin-bottom:32px;}
          .bd-grid{gap:12px;}
          .bd-s4,.bd-s5,.bd-s7,.bd-s8,.bd-card#feature-psych{grid-column:1 / -1;}
          .bd-demowrap{min-height:0;}
          .bd-kpis{grid-template-columns:repeat(2,minmax(0,1fr));}
          .bd-psych{flex-direction:column;align-items:stretch;gap:16px;}
          .bd-psych>svg{align-self:center;}
          .bd-cta{flex-direction:column;gap:16px;}
          .bd-btn{width:100%;justify-content:center;box-sizing:border-box;}
        }
        @media (prefers-reduced-motion:reduce){
          .bd-eqline{animation:none;stroke-dashoffset:0;}
          .bd-caret{animation:none;opacity:.5;}
          .bd-card,.bd-card:hover{transform:none;}
        }
      `}</style>
    </section>
  );
}
