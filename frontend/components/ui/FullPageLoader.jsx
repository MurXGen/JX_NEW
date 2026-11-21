"use client";

import React from "react";

/**
 * FullPageLoader: four candlesticks that rise and fall in a soft, staggered
 * wave. No wordmark or text on screen; `label` is kept for screen readers.
 * Respects prefers-reduced-motion. Same props as before: { label }.
 */

// [colour, wick height, body height] in px; the wave scales each body
const CANDLES = [
  ["up", 40, 22],
  ["down", 46, 28],
  ["up", 50, 30],
  ["up", 56, 36],
];

const FullPageLoader = ({ label = "Loading your journal…" }) => (
  <div className="jxl" role="status" aria-live="polite" aria-busy="true">
    <div className="jxl__candles" aria-hidden="true">
      {CANDLES.map(([dir, wick, body], i) => (
        <span
          key={i}
          className={`jxl__c jxl__c--${dir}`}
          style={{ "--wick": `${wick}px`, "--body": `${body}px`, "--d": `${i * 0.14}s` }}
        >
          <i />
        </span>
      ))}
    </div>
    <span className="jxl__sr">{label}</span>

    <style>{`
      .jxl {
        position: fixed; inset: 0; z-index: 9999;
        display: grid; place-items: center;
        background: #101115;
      }
      [data-theme="light"] .jxl { background: #f2f3f6; }

      .jxl__candles { display: flex; align-items: center; gap: 12px; height: 64px; }

      .jxl__c {
        position: relative; display: grid; place-items: center;
        width: 12px; height: var(--wick);
        animation: jxl-wave 1.4s cubic-bezier(0.45, 0, 0.55, 1) var(--d) infinite;
      }
      /* wick */
      .jxl__c::before {
        content: ""; position: absolute; left: 50%; top: 0; bottom: 0;
        width: 2px; margin-left: -1px; border-radius: 2px;
        background: currentColor; opacity: 0.55;
      }
      /* body */
      .jxl__c i {
        position: relative; display: block; width: 12px; height: var(--body);
        border-radius: 3px; background: currentColor;
        transform-origin: center;
        animation: jxl-body 1.4s cubic-bezier(0.45, 0, 0.55, 1) var(--d) infinite;
      }
      .jxl__c--up { color: #2ebd85; }
      .jxl__c--down { color: #f6465d; }
      [data-theme="light"] .jxl__c--up { color: #12965f; }
      [data-theme="light"] .jxl__c--down { color: #d63249; }

      @keyframes jxl-wave {
        0%, 100% { transform: translateY(6px); opacity: 0.55; }
        50% { transform: translateY(-6px); opacity: 1; }
      }
      @keyframes jxl-body {
        0%, 100% { transform: scaleY(0.6); }
        50% { transform: scaleY(1); }
      }

      .jxl__sr {
        position: absolute; width: 1px; height: 1px; overflow: hidden;
        clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap;
      }

      @media (prefers-reduced-motion: reduce) {
        .jxl__c, .jxl__c i { animation: none; }
      }
    `}</style>
  </div>
);

export default FullPageLoader;
