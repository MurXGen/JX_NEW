"use client";

/* JournalX hero — x.ai-style first section.
   SEO-safe: the <h1> ships its full keyword phrase as real text in the server
   HTML ("The trading journal built for funded traders"); the rotating word is
   one truthful audience swapped for motion, never changing the claim, and the
   width is reserved in ch units so there is zero layout shift (CLS).
   framer-motion drives a light staggered entrance; the h1 paints visible on
   first frame (never animated from opacity 0) to protect LCP. Reduced-motion
   freezes every loop on its first, legible word. */

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";

/* real audiences — every one keeps "…journal built for ___ traders" true */
const WORDS = ["funded", "prop-firm", "futures", "forex", "crypto"];
const LONGEST = WORDS.reduce((a, b) => (b.length > a.length ? b : a), "");

const EASE = [0.22, 1, 0.36, 1];
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const rise = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

function RotatingWord() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setI((v) => (v + 1) % WORDS.length), 2600);
    return () => clearInterval(t);
  }, [reduce]);
  const word = reduce ? WORDS[0] : WORDS[i];
  return (
    <span className="hero-rot" style={{ width: `${LONGEST.length + 0.5}ch` }}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={word}
          className="hero-rot__word"
          initial={reduce ? false : { opacity: 0, filter: "blur(10px)", y: "0.28em" }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          exit={reduce ? undefined : { opacity: 0, filter: "blur(10px)", y: "-0.28em" }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          {word}
        </motion.span>
      </AnimatePresence>
      <span className="hero-rot__underline" aria-hidden="true" />
    </span>
  );
}

export default function HeroSection() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div aria-hidden="true" className="hero-glow" />
      <motion.div
        className="hero-inner"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* announcement — a real, recent feature */}
        <motion.a variants={rise} href="/register" className="hero-badge" aria-label="New: auto-import your crypto trades">
          <span className="hero-badge__tag">NEW</span>
          <span>Auto-import your crypto trades</span>
          <Play size={11} aria-hidden="true" style={{ opacity: 0.65 }} />
        </motion.a>

        {/* h1 paints immediately (not inside the fade variant) → protects LCP.
            Full keyword phrase is real text; the rotating word is decoration. */}
        <h1 id="hero-title" className="hero-h1">
          The trading journal<br />
          built for{" "}
          <span className="hero-slot">
            <RotatingWord />
          </span>{" "}
          traders
          <span className="hero-caret" aria-hidden="true" />
        </h1>

        <motion.p variants={rise} className="hero-sub">
          Deep analytics on win rate, risk, drawdown and psychology — computed from your real trade log, across forex, futures, stocks and crypto.
        </motion.p>

        <motion.div variants={rise} className="hero-cta">
          <a href="/register" className="hero-pill hero-pill--primary">Start free <ArrowRight size={16} aria-hidden="true" /></a>
          <a href="/features" className="hero-pill hero-pill--ghost">See how it works</a>
        </motion.div>

        {/* a light "neat grid" of what's inside — content + internal links + balance */}
        <motion.ul variants={rise} className="hero-chips" aria-label="What's inside JournalX">
          {[
            ["Log in seconds", "/features"],
            ["Win rate & R-multiple", "/features"],
            ["Drawdown guard", "/features"],
            ["Auto-import", "/integrations"],
          ].map(([label, href]) => (
            <li key={label}><a href={href}>{label}</a></li>
          ))}
        </motion.ul>
      </motion.div>

      <style jsx>{`
        .hero{position:relative;min-height:88vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:120px 24px 72px;overflow:hidden;background:#000;color:#fff;font-family:Inter,-apple-system,Segoe UI,Roboto,sans-serif;font-feature-settings:"cv11","ss01";}
        .hero-glow{position:absolute;top:-10%;left:50%;width:min(880px,90vw);height:520px;transform:translateX(-50%);background:radial-gradient(closest-side,rgba(255,255,255,0.07),transparent 72%);animation:heroDrift 14s ease-in-out infinite;pointer-events:none;}
        @keyframes heroDrift{0%,100%{transform:translateX(-50%) translateY(0);}50%{transform:translateX(-46%) translateY(14px);}}
        .hero-inner{position:relative;z-index:1;max-width:1040px;margin:0 auto;display:flex;flex-direction:column;align-items:center;}

        .hero-badge{display:inline-flex;align-items:center;gap:9px;height:38px;padding:0 14px 0 8px;border-radius:9999px;border:1px solid #2A2A2A;background:#0F0F0F;color:#9B9B9B;font:500 13.5px Inter;text-decoration:none;transition:.2s;}
        .hero-badge:hover{border-color:#3a3a3a;color:#fff;}
        .hero-badge__tag{font:600 10.5px Inter;letter-spacing:.06em;color:#000;background:#FCD535;border-radius:9999px;padding:3px 8px;}

        .hero-h1{margin:26px 0 0;font-weight:300;font-size:clamp(40px,7.2vw,92px);line-height:1.05;letter-spacing:-0.025em;color:#fff;}
        .hero-slot{display:inline-block;}
        .hero-rot{position:relative;display:inline-block;text-align:left;vertical-align:baseline;}
        .hero-rot__word{display:inline-block;color:#fff;white-space:nowrap;}
        .hero-rot__underline{position:absolute;left:0;right:0;bottom:-0.06em;height:2px;background:#3a3a3a;border-radius:2px;}
        .hero-caret{display:inline-block;width:3px;height:0.86em;margin-left:8px;background:#fff;transform:translateY(0.1em);animation:heroBlink 1.05s steps(1) infinite;}
        @keyframes heroBlink{50%{opacity:0;}}

        .hero-sub{margin:26px auto 0;max-width:620px;font-weight:400;font-size:clamp(16px,1.8vw,20px);line-height:1.55;color:#9B9B9B;}

        .hero-cta{display:flex;gap:12px;margin-top:34px;flex-wrap:wrap;justify-content:center;}
        .hero-pill{display:inline-flex;align-items:center;gap:8px;height:52px;padding:0 28px;border-radius:9999px;font:500 15px Inter;text-decoration:none;transition:.2s;}
        .hero-pill--primary{background:#fff;color:#000;border:1px solid #fff;}
        .hero-pill--primary:hover{background:#e9e9e9;}
        .hero-pill--ghost{background:transparent;color:#fff;border:1px solid #2A2A2A;}
        .hero-pill--ghost:hover{border-color:#6b6b6b;}

        .hero-chips{list-style:none;display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin:42px 0 0;padding:0;}
        .hero-chips a{display:inline-block;font:500 13px Inter;color:#9B9B9B;text-decoration:none;border:1px solid #1F1F1F;background:#0B0B0B;border-radius:9999px;padding:8px 14px;transition:.2s;}
        .hero-chips a:hover{color:#fff;border-color:#2A2A2A;}

        @media (max-width:768px){
          .hero{min-height:84vh;padding:96px 16px 56px;}
          .hero-h1{font-size:clamp(36px,10vw,56px);}
        }
        @media (prefers-reduced-motion:reduce){
          .hero-glow{animation:none;}
          .hero-caret{animation:none;opacity:.55;}
        }
      `}</style>
    </section>
  );
}
