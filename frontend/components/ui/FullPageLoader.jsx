"use client";

import React, { useEffect, useState } from "react";

/**
 * FullPageLoader, the app-wide page loader in the JournalX dark system:
 * black canvas with the silver top-right glow, the JournalX wordmark with a
 * soft shimmer, a price line that draws itself in, and a status line that
 * rotates through short trading tips if loading takes a moment.
 * Respects prefers-reduced-motion. Same props as before: { label }.
 */

const TIPS = [
  "Tip: tag every setup so you can see which one actually pays",
  "Tip: a 1 : 2 reward-to-risk only needs a 34% win rate to break even",
  "Tip: review your worst day each week, it teaches more than your best",
  "Tip: size so a stop-out costs about 1% of the account",
];

const PATH = "M2 30 L14 24 L24 27 L36 16 L46 20 L58 9 L70 13 L82 4 L94 8 L106 2";

const FullPageLoader = ({ label = "Loading your journal…" }) => {
  const [tip, setTip] = useState(-1);
  useEffect(() => {
    // only start tips if loading lasts a while, then rotate them
    const start = setTimeout(() => setTip(0), 1800);
    const id = setInterval(() => setTip((t) => (t < 0 ? t : (t + 1) % TIPS.length)), 3200);
    return () => { clearTimeout(start); clearInterval(id); };
  }, []);

  return (
    <div className="jxl" role="status" aria-live="polite" aria-busy="true">
      <div className="jxl__center">
        <span className="jxl__word" aria-hidden="true">Journal<em>X</em></span>

        <svg className="jxl__chart" viewBox="0 0 108 34" aria-hidden="true">
          <defs>
            <linearGradient id="jxl-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2ebd85" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#2ebd85" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path className="jxl__area" d={`${PATH} L106 34 L2 34 Z`} fill="url(#jxl-fill)" />
          <path className="jxl__line" d={PATH} pathLength="1" />
          <circle className="jxl__dot" r="2.6" cx="106" cy="2" />
        </svg>

        <div className="jxl__bar" aria-hidden="true"><i /></div>

        <span className="jxl__label">{label}</span>
        <span className="jxl__tip" key={tip} aria-hidden={tip < 0}>
          {tip >= 0 ? TIPS[tip] : " "}
        </span>
      </div>

      <style>{`
        .jxl {
          position: fixed; inset: 0; z-index: 9999;
          display: grid; place-items: center;
          font-family: "Poppins", -apple-system, BlinkMacSystemFont, sans-serif;
          color: #f5f6f8;
          background:
            radial-gradient(520px 340px at 100% 0%, rgba(214, 220, 230, 0.13), rgba(214, 220, 230, 0) 72%),
            radial-gradient(240px 170px at 100% 0%, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0) 70%),
            #000;
        }
        [data-theme="light"] .jxl { color: #111318; background: radial-gradient(520px 340px at 100% 0%, rgba(17, 19, 24, 0.06), rgba(17, 19, 24, 0) 72%), #f7f7f8; }
        .jxl__center { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 24px; text-align: center; }
        .jxl__word {
          font-size: 30px; font-weight: 700; letter-spacing: -0.8px; line-height: 1;
          background: linear-gradient(100deg, #9aa1ad 20%, #ffffff 40%, #9aa1ad 60%) 0 0 / 250% 100%;
          -webkit-background-clip: text; background-clip: text; color: transparent;
          animation: jxl-shine 2.4s ease-in-out infinite;
        }
        [data-theme="light"] .jxl__word { background-image: linear-gradient(100deg, #33373f 20%, #8a909b 40%, #33373f 60%); }
        .jxl__word em { font-style: normal; color: #fcd535; -webkit-text-fill-color: #fcd535; }
        .jxl__chart { width: 120px; height: 38px; overflow: visible; }
        .jxl__line {
          fill: none; stroke: #2ebd85; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;
          stroke-dasharray: 1; stroke-dashoffset: 1;
          filter: drop-shadow(0 0 4px rgba(46, 189, 133, 0.55));
          animation: jxl-draw 1.6s cubic-bezier(0.65, 0, 0.35, 1) infinite;
        }
        .jxl__area { opacity: 0; animation: jxl-area 1.6s ease-in-out infinite; }
        .jxl__dot { fill: #f5f6f8; opacity: 0; filter: drop-shadow(0 0 5px rgba(245, 246, 248, 0.9)); animation: jxl-dot 1.6s ease-in-out infinite; }
        .jxl__bar { position: relative; width: 140px; height: 3px; border-radius: 999px; overflow: hidden; background: rgba(255, 255, 255, 0.08); }
        [data-theme="light"] .jxl__bar { background: rgba(0, 0, 0, 0.08); }
        .jxl__bar i {
          position: absolute; top: 0; bottom: 0; left: 0; width: 40%; border-radius: inherit;
          background: linear-gradient(90deg, rgba(252, 213, 53, 0), #fcd535, rgba(252, 213, 53, 0));
          animation: jxl-slide 1.3s ease-in-out infinite;
        }
        .jxl__label { font-size: 13.5px; font-weight: 500; color: #c7ccd4; }
        [data-theme="light"] .jxl__label { color: #33373f; }
        .jxl__tip { max-width: 320px; min-height: 18px; font-size: 12px; line-height: 1.5; color: #6f7785; animation: jxl-fade 0.5s ease; }

        @keyframes jxl-shine { 0% { background-position: 100% 0; } 100% { background-position: -50% 0; } }
        @keyframes jxl-draw { 0% { stroke-dashoffset: 1; } 55%, 85% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: 0; opacity: 0; } }
        @keyframes jxl-area { 0%, 30% { opacity: 0; } 60%, 85% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes jxl-dot { 0%, 50% { opacity: 0; } 60%, 85% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes jxl-slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } }
        @keyframes jxl-fade { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: none; } }

        @media (prefers-reduced-motion: reduce) {
          .jxl__word, .jxl__line, .jxl__area, .jxl__dot, .jxl__bar i, .jxl__tip { animation: none; }
          .jxl__line { stroke-dashoffset: 0; }
          .jxl__area, .jxl__dot { opacity: 1; }
          .jxl__bar i { left: 30%; }
        }
      `}</style>
    </div>
  );
};

export default FullPageLoader;
