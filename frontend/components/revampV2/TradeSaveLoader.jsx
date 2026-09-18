"use client";

/* Playful save-state overlay for the Log/Edit trade modal. Instead of a bare
   spinner, it shows a live-looking candlestick chart the user can tap (candles
   flip green and pop) while the trade is being saved — so the wait feels
   interactive. Still clearly communicates "saving" with a status line. */

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

const LINES = [
  "Booking your trade…",
  "Crunching your P&L…",
  "Updating your edge…",
  "Filing it in your journal…",
];

export default function TradeSaveLoader({ label = "Saving your trade" }) {
  const [taps, setTaps] = useState(0);
  const [flipped, setFlipped] = useState({});
  const [lineIdx, setLineIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setLineIdx((i) => (i + 1) % LINES.length), 1400);
    return () => clearInterval(t);
  }, []);

  // a row of candles with staggered "live" animation targets
  const candles = useMemo(
    () =>
      Array.from({ length: 11 }, (_, i) => ({
        id: i,
        up: Math.random() > 0.45,
        h: 26 + Math.round(Math.random() * 60),
        wick: 10 + Math.round(Math.random() * 16),
        delay: i * 0.09,
      })),
    [],
  );

  const tap = (id, up) => {
    setFlipped((f) => ({ ...f, [id]: !up ? true : f[id] }));
    setTaps((n) => n + 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-5)",
        padding: "var(--space-6)",
        background: "color-mix(in srgb, var(--color-bg-canvas) 88%, transparent)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
    >
      {/* candlestick chart */}
      <div
        aria-hidden="true"
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 8,
          height: 130,
          width: "100%",
          maxWidth: 340,
        }}
      >
        {candles.map((c) => {
          const isGreen = flipped[c.id] ? true : c.up;
          const col = isGreen ? "var(--color-success)" : "var(--color-danger)";
          return (
            <motion.button
              key={c.id}
              type="button"
              onClick={() => tap(c.id, c.up)}
              whileTap={{ scale: 1.25 }}
              style={{
                position: "relative",
                width: 16,
                height: c.h,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* wick */}
              <span style={{ position: "absolute", width: 2, height: c.h + c.wick, background: col, borderRadius: 2, opacity: 0.55 }} />
              {/* body */}
              <motion.span
                animate={{ scaleY: [0.7, 1, 0.82, 1], opacity: [0.75, 1, 0.85, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: c.delay }}
                style={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  background: col,
                  borderRadius: 3,
                  boxShadow: `0 0 10px color-mix(in srgb, ${col} 45%, transparent)`,
                  transformOrigin: "bottom",
                }}
              />
            </motion.button>
          );
        })}
      </div>

      {/* status line + spinner */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-2)" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.85, ease: "linear" }}
            style={{
              width: 16, height: 16, borderRadius: "50%", display: "inline-block",
              border: "2px solid color-mix(in srgb, var(--color-primary) 30%, transparent)",
              borderTopColor: "var(--color-primary)",
            }}
          />
          <span style={{ font: "var(--text-h3)", fontWeight: 600 }}>{label}</span>
        </div>
        <motion.span
          key={lineIdx}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ font: "var(--text-body-md)", color: "var(--color-text-muted)" }}
        >
          {LINES[lineIdx]}
        </motion.span>
      </div>

      {/* interactive nudge */}
      <div
        style={{
          display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px",
          borderRadius: "var(--radius-pill)", background: "var(--color-bg-muted)",
          border: "1px solid var(--color-border)", font: "var(--text-caption)", color: "var(--color-text-secondary)",
        }}
      >
        <span>👆 Flip the red candles green while we save</span>
        <span style={{ fontWeight: 700, color: "var(--color-success-strong)", fontVariantNumeric: "tabular-nums" }}>
          {taps}
        </span>
      </div>
    </motion.div>
  );
}
