"use client";

import React from "react";
import { motion } from "framer-motion";

/**
 * FullPageLoader — trading-themed candlestick loader (revamp v2).
 * Five candles pulse like a live chart while a price line sweeps
 * underneath. Used as the page loader across the app.
 */

const CANDLES = [
  { h: 34, wickTop: 10, wickBot: 8, up: true, delay: 0 },
  { h: 22, wickTop: 8, wickBot: 12, up: false, delay: 0.12 },
  { h: 42, wickTop: 12, wickBot: 6, up: true, delay: 0.24 },
  { h: 26, wickTop: 6, wickBot: 10, up: false, delay: 0.36 },
  { h: 48, wickTop: 14, wickBot: 8, up: true, delay: 0.48 },
];

const FullPageLoader = ({ label = "Charting your edge…" }) => {
  return (
    <div
      className="fullpageLoader"
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        background: "var(--color-bg-canvas, #181a20)",
        zIndex: 9999,
        fontFamily: "var(--jx-font, Poppins, sans-serif)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 90 }}>
        {CANDLES.map((c, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0.3, scaleY: 0.6 }}
            animate={{ opacity: [0.3, 1, 0.3], scaleY: [0.6, 1, 0.6] }}
            transition={{ repeat: Infinity, duration: 1.4, delay: c.delay, ease: "easeInOut" }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              transformOrigin: "bottom",
            }}
          >
            <span style={{ width: 2, height: c.wickTop, background: c.up ? "var(--green-500, #2ebd85)" : "var(--red-500, #f6465d)" }} />
            <span style={{ width: 14, height: c.h, borderRadius: 3, background: c.up ? "var(--green-500, #2ebd85)" : "var(--red-500, #f6465d)" }} />
            <span style={{ width: 2, height: c.wickBot, background: c.up ? "var(--green-500, #2ebd85)" : "var(--red-500, #f6465d)" }} />
          </motion.div>
        ))}
      </div>

      {/* price line sweeping across */}
      <div
        style={{
          position: "relative",
          width: 150,
          height: 2,
          overflow: "hidden",
          borderRadius: 2,
          background: "color-mix(in srgb, var(--yellow-300, #fcd535) 20%, transparent)",
        }}
      >
        <motion.span
          animate={{ x: [-60, 150] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 60,
            height: 2,
            borderRadius: 2,
            background: "var(--yellow-300, #fcd535)",
          }}
        />
      </div>

      <motion.span
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 1.6 }}
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: "var(--color-text-muted, #707a8a)",
          letterSpacing: 0.3,
        }}
      >
        {label}
      </motion.span>
    </div>
  );
};

export default FullPageLoader;
