"use client";

/* Landing sections below the feature bento:
   IntegrationsSection · HowItWorksSection · MoreToolsSection.
   All copy is server-rendered text (broker names included) for SEO. */

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Bitcoin,
  CandlestickChart,
  Check,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import s from "./Sections.module.css";

const reveal = (i = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.45, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] },
});

/* ---------- Brokers & exchanges ---------- */
const GROUPS = [
  { title: "Stocks & options", Icon: TrendingUp, items: ["Interactive Brokers", "Thinkorswim", "Charles Schwab", "E*TRADE", "Webull", "Robinhood", "Fidelity", "Tastytrade"] },
  { title: "Futures", Icon: CandlestickChart, items: ["NinjaTrader", "Tradovate", "AMP Futures"] },
  { title: "Forex & CFDs", Icon: DollarSign, items: ["MetaTrader 4", "MetaTrader 5", "cTrader", "OANDA", "IG"] },
  { title: "Crypto", Icon: Bitcoin, items: ["Binance", "Bybit", "Coinbase", "Kraken", "OKX"] },
];

export function IntegrationsSection() {
  return (
    <section id="brokers" className={s.sec} aria-labelledby="brokers-title">
      <div className={s.inner}>
        <div className={s.head}>
          <span className={s.kicker}>Brokers &amp; exchanges</span>
          <h2 id="brokers-title" className={s.h2}>Import trades from the <span>brokers and exchanges</span> you already use</h2>
          <p className={s.lead}>
            Bring your trade history into your trading journal in minutes. Auto-sync supported exchanges, or upload a CSV
            export from any broker, prop firm platform or trading terminal.
          </p>
        </div>

        <div className={s.groups}>
          {GROUPS.map(({ title, Icon, items }, i) => (
            <motion.div key={title} className={s.group} {...reveal(i)}>
              <div className={s.groupHead}>
                <span className={s.groupIcon} aria-hidden="true"><Icon size={15} strokeWidth={1.8} /></span>
                <h3 className={s.groupTitle}>{title}</h3>
              </div>
              <ul className={s.groupList} aria-label={`${title} brokers and platforms`}>
                {items.map((n) => <li key={n}>{n}</li>)}
              </ul>
            </motion.div>
          ))}
        </div>

        <motion.div className={s.csv} {...reveal(1)}>
          <div>
            <b>Any other platform? Import with CSV.</b>
            <span>Export your trade history, drop the file in, and JournalX maps and de-duplicates it.</span>
          </div>
          <div className={s.csvSteps} aria-label="CSV import steps">
            <em>1 · Export CSV</em><em>2 · Upload</em><em>3 · Review analytics</em>
          </div>
        </motion.div>
        <p className={s.note}>
          Platform names are trademarks of their owners. Availability of direct sync varies by platform; CSV import works with any of them.
        </p>
      </div>
    </section>
  );
}

/* ---------- How it works ---------- */
const STEPS = [
  {
    meta: "About 10 seconds",
    title: "Log or import your trades",
    body: "Quick-log a trade right after you close it, or import your full history from your broker or exchange.",
    points: ["Quick log or detailed entry", "CSV import and exchange sync", "Tag setup, emotion and mistakes"],
  },
  {
    meta: "Instant",
    title: "Review your trading analytics",
    body: "Your dashboard updates win rate, R-multiple, profit factor, drawdown and P&L calendar from real trades.",
    points: ["Equity curve and P&L calendar", "Per-setup and per-session stats", "Discipline and psychology score"],
  },
  {
    meta: "Every week",
    title: "Fix one leak at a time",
    body: "Find your most expensive habit, set a rule against it, and watch the next week of trades confirm the fix.",
    points: ["Spot costly mistakes in dollars", "Track rule-following over time", "Protect your account from drawdown"],
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className={s.sec} aria-labelledby="how-title">
      <div className={s.inner}>
        <div className={s.head}>
          <span className={s.kicker}>How it works</span>
          <h2 id="how-title" className={s.h2}>How to keep a trading journal that <span>actually improves</span> your results</h2>
          <p className={s.lead}>Three steps, repeated every week. Consistent journaling is how traders turn random results into a measurable edge.</p>
        </div>
        <ol className={s.steps}>
          {STEPS.map((st, i) => (
            <motion.li key={st.title} className={s.step} {...reveal(i)}>
              <span className={s.stepNum} aria-hidden="true"><b>{String(i + 1).padStart(2, "0")}</b></span>
              <div className={s.stepCard}>
                <span className={s.stepMeta}>Step {i + 1} · {st.meta}</span>
                <h3 className={s.stepTitle}>{st.title}</h3>
                <p className={s.stepBody}>{st.body}</p>
                <ul className={s.stepPoints}>
                  {st.points.map((p) => <li key={p}><Check size={14} aria-hidden="true" />{p}</li>)}
                </ul>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------- Trader journey (illustrative case study with count-ups) ---------- */

/* Counts up from 0 when scrolled into view. SSR renders the final value so the
   number is in the HTML; reduced motion keeps it static. */
function CountUp({ to, decimals = 0, prefix = "", suffix = "", dur = 1600, signed = false }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const [val, setVal] = useState(to);
  useEffect(() => {
    if (reduce) return undefined;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    setVal(0);
    let raf;
    let started = false;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || started) return;
      started = true;
      const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        setVal(to * eased);
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.3 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); setVal(to); };
  }, [to, dur, reduce]);
  const abs = Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const sign = signed ? (to < 0 ? "−" : "+") : to < 0 ? "−" : "";
  return <span ref={ref} className={s.count}>{sign}{prefix}{abs}{suffix}</span>;
}

const JOURNEY = [
  { when: "Week 1", title: "Started journaling", detail: "Imported 3 months of trades", value: { to: 148, suffix: " trades" }, tone: "neutral" },
  { when: "Week 2", title: "Found the leak", detail: "Revenge trades after 2 losses", value: { to: -1240, prefix: "$", signed: true }, tone: "red" },
  { when: "Week 4", title: "Set one rule", detail: "Stop after 2 losses in a day", value: { to: 92, suffix: "%" }, sub: "Rule followed", tone: "gold" },
  { when: "Week 8", title: "Back to consistent profit", detail: "Max drawdown kept at 3.1%", value: { to: 4050, prefix: "$", signed: true }, tone: "green" },
];

const TOOL_CHIPS = ["Chart trade marking", "Live market context", "Risk and position sizing", "Equity growth candles", "Desktop and mobile PWA", "No spreadsheets"];

export function JourneySection() {
  return (
    <section id="trader-journey" className={s.sec} aria-labelledby="journey-title" style={{ paddingTop: 40 }}>
      <div className={s.inner}>
        <div className={s.jHead}>
          <div>
            <span className={s.kicker}>Trader&apos;s journey</span>
            <h2 id="journey-title" className={s.jTitle}>From losing streak to consistent, <span>one leak at a time</span></h2>
            <p className={s.jMeta}>
              <span>Example journey</span><i aria-hidden="true">•</i><span>8 weeks</span><i aria-hidden="true">•</i><span>Personal or funded account</span>
            </p>
          </div>
          <motion.figure className={s.jQuote} {...reveal(1)}>
            <span className={s.jStars} aria-hidden="true">★★★★★</span>
            <blockquote>&ldquo;The journal showed me it wasn&apos;t my strategy, it was what I did after two losses.&rdquo;</blockquote>
            <figcaption><b>Rahul K.</b> · Futures day trader</figcaption>
          </motion.figure>
        </div>

        <div className={s.jGrid}>
          <ol className={s.jSteps}>
            {JOURNEY.map((j, i) => (
              <motion.li key={j.when} className={s.jStep} {...reveal(i)}>
                <span className={s.jWhen}>{j.when}</span>
                <h3 className={s.jStepTitle}>{j.title}</h3>
                <div className={`${s.jValue} ${s[`tone_${j.tone}`]}`}>
                  {j.tone === "green" && <span className={s.jCheck} aria-hidden="true"><Check size={14} /></span>}
                  <CountUp {...j.value} />
                </div>
                <span className={s.jDetail}>{j.sub ? `${j.sub} · ` : ""}{j.detail}</span>
              </motion.li>
            ))}
          </ol>

          <motion.aside className={s.jCard} {...reveal(2)} aria-label="Journey result">
            <span className={s.jCardLabel}>Net P&amp;L swing in 8 weeks</span>
            <div className={s.jCardBig}><CountUp to={5290} prefix="$" signed dur={2000} /></div>
            <div className={s.jCardFrom}>
              <span className={s.jRed}>−$1,240</span>
              <ArrowRight size={14} aria-hidden="true" />
              <b className={s.jGreen}>+$4,050</b>
            </div>
            <div className={s.jCardStats}>
              <div><span>Win rate</span><b><CountUp to={58} suffix="%" /></b><em>from 41%</em></div>
              <div><span>Profit factor</span><b><CountUp to={1.9} decimals={1} /></b><em>from 0.8</em></div>
            </div>
            <a href="/register" className={s.goldBtn} style={{ width: "100%", justifyContent: "center", boxSizing: "border-box" }}>
              Start your journey free <ArrowRight size={15} aria-hidden="true" />
            </a>
          </motion.aside>
        </div>

        <p className={s.note}>This journey and quote are an illustrative example of how traders use JournalX, not a specific customer result. Trading involves risk and results vary.</p>

        <div className={s.jTools}>
          <span>Also built in:</span>
          <ul>
            {TOOL_CHIPS.map((c) => <li key={c}>{c}</li>)}
          </ul>
          <a href="/features" className={s.jToolsLink}>All trading journal features <ArrowRight size={13} aria-hidden="true" /></a>
        </div>
      </div>
    </section>
  );
}
