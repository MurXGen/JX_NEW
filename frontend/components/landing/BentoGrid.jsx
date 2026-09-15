"use client";

/* JournalX bento — x.ai-style product grid on pure black. Each card RUNS a
   looping demo of how logging with JournalX helps, rather than describing it:
   Log (a trade types itself) · Analytics (equity curve draws + insight) ·
   Auto-import (terminal streams [running]→[done]) · Psychology (discipline
   gauge fills + tilt cost) · Drawdown guard (bar reacts toward the limit).
   Loops pause off-screen (IntersectionObserver) and freeze on a legible frame
   under prefers-reduced-motion. Semantic colour only: green profit, red loss,
   amber warning. Text ships in the DOM; graphics carry aria summaries. */

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Eyebrow from "@/components/landing/Eyebrow";

const GREEN = "#2ebd85", RED = "#f6465d", AMBER = "#f0b90b";

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
  const [typed, setTyped] = useState(reduce ? sym : "");
  const [filled, setFilled] = useState(reduce);
  useEffect(() => {
    if (reduce || !on) return;
    let i = 0; setTyped(""); setFilled(false);
    const type = setInterval(() => { i += 1; setTyped(sym.slice(0, i)); if (i >= sym.length) { clearInterval(type); setTimeout(() => setFilled(true), 350); } }, 120);
    const loop = setInterval(() => {
      i = 0; setTyped(""); setFilled(false);
      const t2 = setInterval(() => { i += 1; setTyped(sym.slice(0, i)); if (i >= sym.length) { clearInterval(t2); setTimeout(() => setFilled(true), 350); } }, 120);
    }, 5600);
    return () => { clearInterval(type); clearInterval(loop); };
  }, [on, reduce]);
  const Row = ({ k, v, c, show }) => (
    <div className="bd-row"><span className="bd-k">{k}</span><span className="bd-v" style={{ color: c, opacity: show ? 1 : 0.25, transition: "opacity .35s" }}>{show ? v : "—"}</span></div>
  );
  return (
    <div className="bd-demo" aria-hidden="true">
      <div className="bd-row"><span className="bd-k">Symbol</span><span className="bd-v">{typed}<span className="bd-caret" /></span></div>
      <Row k="Entry" v="1.0842" show={filled} />
      <Row k="Exit" v="1.0918" show={filled} />
      <Row k="Result" v="+2.1R" c={GREEN} show={filled} />
      <div className="bd-tags">
        <span className="bd-tag" data-on={filled}>Followed plan</span>
        <span className="bd-tag" data-on={filled} style={{ transitionDelay: "120ms" }}>Calm</span>
      </div>
    </div>
  );
}

/* ── Analytics: equity curve draws + one insight ── */
function AnalyticsDemo({ on }) {
  const reduce = useReducedMotion();
  const [ref, inView] = useInView(0.3);
  const d = "M0,86 L26,78 L52,82 L78,62 L104,66 L130,48 L156,54 L182,36 L208,26 L234,30 L260,14";
  const draw = inView && !reduce;
  return (
    <div className="bd-demo" ref={ref} aria-hidden="true">
      <svg viewBox="0 0 260 100" preserveAspectRatio="none" style={{ width: "100%", height: 116 }}>
        <defs><linearGradient id="bdEq" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={GREEN} stopOpacity="0.22" /><stop offset="1" stopColor={GREEN} stopOpacity="0" /></linearGradient></defs>
        <path d={`${d} L260,100 L0,100 Z`} fill="url(#bdEq)" />
        <path d={d} fill="none" stroke={GREEN} strokeWidth="1.6" vectorEffect="non-scaling-stroke" key={draw ? "a" : "s"} className={draw ? "bd-eqline" : ""} />
      </svg>
      <div className="bd-insight"><span className="bd-dot" style={{ background: GREEN }} />Win rate drops <b>22%</b> on trades after 2pm</div>
    </div>
  );
}

/* ── Auto-import: terminal rows flip to done ── */
const ROWS = [["Connect Binance", "done"], ["Fetch fills · 28d", "done"], ["Pair round-trips", "running"], ["Skip duplicates", "queued"]];
function ImportDemo({ on }) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(reduce ? ROWS.length + 2 : 0);
  useEffect(() => {
    if (reduce || !on) return;
    setStep(0);
    const t = setInterval(() => setStep((s) => (s >= ROWS.length + 2 ? 0 : s + 1)), 950);
    return () => clearInterval(t);
  }, [on, reduce]);
  const stFor = (i, base) => reduce ? (base === "queued" ? "done" : base) : i < step ? "done" : i === step ? "running" : "queued";
  return (
    <div className="bd-demo bd-term" aria-hidden="true">
      <div className="bd-bar"><i className="bd-o" style={{ background: RED }} /><i className="bd-o" style={{ background: AMBER }} /><i className="bd-o" style={{ background: GREEN }} /><span>import · binance</span></div>
      <div className="bd-termbody">
        {ROWS.map((r, i) => { const s = stFor(i, r[1]); return (
          <div className="bd-trow" key={i}><span>{r[0]}</span><span className={`bd-st bd-st--${s}`}>[{s}]</span></div>
        ); })}
        <div className="bd-done">{(reduce || step > ROWS.length) ? "Imported 24 trades · 0 duplicates" : " "}</div>
      </div>
    </div>
  );
}

/* ── Psychology (wide): discipline gauge + tilt cost ── */
function PsychDemo({ on }) {
  const reduce = useReducedMotion();
  const [score, setScore] = useState(reduce ? 82 : 0);
  useEffect(() => {
    if (reduce || !on) return;
    const run = (cb) => { let v = 0; const t = setInterval(() => { v += 3; if (v >= 82) { v = 82; clearInterval(t); } cb(v); }, 32); return t; };
    let t = run(setScore);
    const loop = setInterval(() => { clearInterval(t); t = run(setScore); }, 5000);
    return () => { clearInterval(t); clearInterval(loop); };
  }, [on, reduce]);
  const r = 44, C = 2 * Math.PI * r, off = C * (1 - score / 100);
  return (
    <div className="bd-demo bd-psych" aria-hidden="true">
      <svg viewBox="0 0 120 120" width="130" height="130" style={{ flex: "0 0 auto" }}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="#1c1c1c" strokeWidth="8" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={GREEN} strokeWidth="8" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={off} transform="rotate(-90 60 60)" style={{ transition: reduce ? "none" : "stroke-dashoffset .09s linear" }} />
        <text x="60" y="58" textAnchor="middle" fill="#fff" style={{ font: "300 30px Poppins" }}>{score}</text>
        <text x="60" y="76" textAnchor="middle" fill="#7a7a7a" style={{ font: "500 9px Poppins", letterSpacing: "0.08em" }}>DISCIPLINE</text>
      </svg>
      <div className="bd-pside">
        <div className="bd-pstat"><span>Tilt cost this week</span><b style={{ color: RED }}>-$412</b></div>
        <div className="bd-pstat"><span>Best setup</span><b>Breakout · 71%</b></div>
        <div className="bd-tags">{["FOMO", "Revenge", "Overtrade"].map((t, k) => <span key={t} className="bd-tag" data-on="true" style={{ transitionDelay: `${k * 90}ms` }}>{t}</span>)}</div>
      </div>
    </div>
  );
}

/* ── Drawdown guard: bar reacts toward the limit ── */
function DrawdownDemo({ on }) {
  const reduce = useReducedMotion();
  const [pct, setPct] = useState(reduce ? 62 : 20);
  useEffect(() => {
    if (reduce || !on) return;
    let up = true, v = 20;
    const t = setInterval(() => { v += up ? 4 : -4; if (v >= 78) up = false; if (v <= 20) up = true; setPct(v); }, 90);
    return () => clearInterval(t);
  }, [on, reduce]);
  const danger = pct > 70;
  return (
    <div className="bd-demo bd-dd" aria-hidden="true">
      <div className="bd-ddhead"><span>Daily drawdown</span><b style={{ color: danger ? RED : "#fff" }}>{((pct / 100) * 5).toFixed(1)}% / 5%</b></div>
      <div className="bd-ddtrack"><div className="bd-ddfill" style={{ width: `${pct}%`, background: danger ? RED : GREEN, transition: reduce ? "none" : "width .09s linear, background .2s" }} /></div>
      <div className="bd-ddnote">{danger ? "Approaching limit — stop for the day" : "Inside your rule"}</div>
    </div>
  );
}

function Card({ label, sub, href, wide, summary, Demo }) {
  const [ref, inView] = useInView(0.15);
  return (
    <motion.article
      ref={ref}
      className={`bd-card${wide ? " bd-card--wide" : ""}`}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="bd-demowrap"><Demo on={inView} /></div>
      <p className="bd-sr">{summary}</p>
      <div className="bd-foot">
        <div><h3 className="bd-label">{label}</h3><span className="bd-sub">{sub}</span></div>
        <a href={href} className="bd-explore">Explore <ArrowRight size={13} aria-hidden="true" /></a>
      </div>
    </motion.article>
  );
}

export default function BentoGrid() {
  return (
    <section className="bd" aria-labelledby="bd-title">
      <div className="bd-inner">
        <div className="bd-head">
          <Eyebrow>Trading journal features</Eyebrow>
          <h2 id="bd-title" className="bd-h2">Everything that makes logging pay off</h2>
          <p className="bd-lead">Log once, and JournalX turns it into the numbers, imports and guardrails that actually protect an account.</p>
        </div>
        <div className="bd-grid">
          <Card label="Log" sub="A full trade in seconds" href="/features" Demo={LogDemo} summary="Log a trade in seconds: symbol, entry, exit, result and a discipline tag." />
          <Card label="Analytics" sub="See your real edge" href="/features" Demo={AnalyticsDemo} summary="Your trade log becomes an equity curve and insights like: win rate drops 22% on trades after 2pm." />
          <Card label="Auto-import" sub="Trades import themselves" href="/dashboard" Demo={ImportDemo} summary="Connect an exchange and JournalX imports fills, pairs round-trips and skips duplicates automatically." />
          <Card label="Psychology" sub="Know what tilt costs you" href="/features" wide Demo={PsychDemo} summary="Every trade is scored for discipline; emotion tags reveal what tilt and FOMO cost you." />
          <Card label="Drawdown guard" sub="Stay inside the rules" href="/features" Demo={DrawdownDemo} summary="Track daily and trailing drawdown against your funded-account limit in real time." />
        </div>
      </div>

      <style jsx global>{`
        .bd{background:#000;padding:112px 24px;font-family:Poppins,sans-serif;}
        .bd-inner{max-width:1200px;margin:0 auto;}
        .bd-head{text-align:center;max-width:640px;margin:0 auto 44px;display:flex;flex-direction:column;align-items:center;}
        .bd-h2{font:300 clamp(28px,3.6vw,44px)/1.12 Poppins;letter-spacing:-0.02em;color:#fff;margin:0;}
        .bd-lead{font:400 clamp(15px,1.6vw,17px)/1.6 Poppins;color:#9b9b9b;margin:14px auto 0;max-width:520px;}
        .bd-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
        .bd-card{position:relative;display:flex;flex-direction:column;background:#0d0d0d;border:1px solid #1c1c1c;border-radius:20px;min-height:320px;overflow:hidden;box-shadow:inset 0 1px 0 rgba(255,255,255,0.05);transition:border-color .2s,transform .2s;}
        .bd-card:hover{border-color:#2a2a2a;transform:translateY(-2px);}
        .bd-card--wide{grid-column:span 2;}
        .bd-demowrap{flex:1;min-height:0;padding:22px;overflow:hidden;}
        .bd-foot{display:flex;align-items:center;justify-content:space-between;height:64px;padding:0 22px;border-top:1px solid #1a1a1a;}
        .bd-label{font:400 19px Poppins;color:#fff;margin:0;}
        .bd-sub{font:400 12.5px Poppins;color:#7a7a7a;}
        .bd-explore{display:inline-flex;align-items:center;gap:5px;font:500 13px Poppins;color:#7a7a7a;text-decoration:none;transition:color .2s;}
        .bd-card:hover .bd-explore{color:#fff;}
        .bd-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);}

        .bd-demo{display:flex;flex-direction:column;gap:9px;height:100%;}
        .bd-row{display:flex;justify-content:space-between;align-items:center;padding:9px 11px;background:#141414;border:1px solid #1c1c1c;border-radius:10px;}
        .bd-k{font:500 11.5px Poppins;color:#7a7a7a;letter-spacing:.02em;}
        .bd-v{font:500 13.5px Poppins;color:#fff;display:inline-flex;align-items:center;}
        .bd-caret{display:inline-block;width:2px;height:1em;margin-left:2px;background:#fff;animation:bdBlink 1s steps(1) infinite;}
        @keyframes bdBlink{50%{opacity:0;}}
        .bd-tags{display:flex;gap:8px;margin-top:2px;}
        .bd-tag{font:500 11.5px Poppins;color:#7a7a7a;border:1px solid #222;border-radius:999px;padding:5px 11px;opacity:0;transform:translateY(4px);transition:opacity .3s,transform .3s;}
        .bd-tag[data-on="true"]{opacity:1;transform:none;color:#c7ccd3;border-color:#2a2a2a;}

        .bd-insight{display:flex;align-items:center;gap:8px;font:400 13px Poppins;color:#c7ccd3;background:#141414;border:1px solid #1c1c1c;border-radius:10px;padding:10px 12px;margin-top:auto;}
        .bd-insight b{color:#fff;}
        .bd-dot{width:7px;height:7px;border-radius:50%;flex:0 0 auto;}
        .bd-eqline{stroke-dasharray:600;stroke-dashoffset:600;animation:bdDraw 2.2s cubic-bezier(0.22,1,0.36,1) forwards;}
        @keyframes bdDraw{to{stroke-dashoffset:0;}}

        .bd-term{font-family:"SFMono-Regular",ui-monospace,Menlo,monospace;background:#111;border:1px solid #1c1c1c;border-radius:12px;overflow:hidden;}
        .bd-bar{display:flex;align-items:center;gap:6px;padding:9px 11px;border-bottom:1px solid #1c1c1c;}
        .bd-o{width:10px;height:10px;border-radius:50%;}
        .bd-bar span{margin-left:8px;font:500 11.5px Poppins;color:#7a7a7a;}
        .bd-termbody{padding:13px;display:flex;flex-direction:column;gap:8px;}
        .bd-trow{display:flex;justify-content:space-between;font-size:12px;color:#9b9b9b;}
        .bd-st--done{color:#2ebd85;}.bd-st--running{color:#f0b90b;}.bd-st--queued{color:#5a5a5a;}
        .bd-done{font:600 12px Poppins;color:#2ebd85;min-height:16px;margin-top:2px;}

        .bd-psych{flex-direction:row;align-items:center;gap:22px;}
        .bd-pside{display:flex;flex-direction:column;gap:11px;flex:1;min-width:0;}
        .bd-pstat{display:flex;justify-content:space-between;align-items:center;font:400 13px Poppins;color:#9b9b9b;border-bottom:1px solid #1a1a1a;padding-bottom:10px;}
        .bd-pstat b{color:#fff;font-weight:500;}

        .bd-dd{justify-content:center;gap:12px;}
        .bd-ddhead{display:flex;justify-content:space-between;font:500 13px Poppins;color:#9b9b9b;}
        .bd-ddtrack{height:10px;border-radius:999px;background:#141414;border:1px solid #1c1c1c;overflow:hidden;}
        .bd-ddfill{height:100%;border-radius:999px;}
        .bd-ddnote{font:400 12px Poppins;color:#7a7a7a;}

        /* desktop keeps the 3-col bento; tablet & mobile get one full-width
           column so every card stretches edge-to-edge */
        @media (max-width:1200px){ .bd-grid{grid-template-columns:repeat(2,1fr);} .bd-card--wide{grid-column:1 / -1;} }
        @media (max-width:1024px){ .bd-grid{grid-template-columns:1fr;} .bd-card,.bd-card--wide{grid-column:1 / -1;} }
        @media (max-width:768px){ .bd{padding:72px 16px;} }
        @media (max-width:560px){ .bd-psych{flex-direction:column;align-items:stretch;gap:16px;} .bd-psych>svg{align-self:center;} .bd-pside{width:100%;flex:none;} .bd-tags{flex-wrap:wrap;} }
        @media (prefers-reduced-motion:reduce){ .bd-eqline{animation:none;stroke-dashoffset:0;} .bd-caret{animation:none;opacity:.5;} }
      `}</style>
    </section>
  );
}
