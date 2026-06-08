"use client";

import { motion } from "framer-motion";
import { BarChart3, BrainCircuit, Zap } from "lucide-react";
import CountUp from "./CountUp";

/**
 * AuthLayout — split auth screen.
 * Left: gradient brand panel with JournalX benefits + stat cards.
 * Right: the form card (children), styled like our stat cards.
 */

const BENEFITS = [
  { icon: Zap, title: "Log trades in seconds", sub: "Quick log or full detail — entries, risk, screenshots, psychology." },
  { icon: BarChart3, title: "Analytics that find your edge", sub: "P&L calendars, R-multiples, strategy and discipline breakdowns." },
  { icon: BrainCircuit, title: "Trade your plan", sub: "Track emotions and mistakes — see what tilt really costs you." },
];

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.1fr) minmax(360px, 1fr)",
        fontFamily: "var(--jx-font)",
        color: "var(--color-text-primary)",
        background:
          "radial-gradient(1200px 800px at -10% -20%, color-mix(in srgb, var(--yellow-300) 26%, transparent), transparent 60%), radial-gradient(900px 700px at 110% 120%, color-mix(in srgb, var(--green-500) 14%, transparent), transparent 60%), var(--color-bg-canvas)",
      }}
      className="jx-auth"
    >
      {/* ===== Left — brand & benefits ===== */}
      <div
        className="jx-auth__left"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "var(--space-6)",
          padding: "var(--space-12)",
        }}
      >
        <a href="/" style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center" }}>
          <span style={{ font: "var(--text-h3)", fontWeight: 700, letterSpacing: "-0.5px" }}>
            Journal<strong style={{ color: "var(--yellow-500)" }}>X</strong>
          </span>
        </a>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 style={{ font: "var(--text-display)", margin: 0, maxWidth: 460 }}>
            The journal that sharpens your edge.
          </h1>
          <p style={{ font: "var(--text-body-lg)", color: "var(--color-text-secondary)", maxWidth: 440 }}>
            Every trade you log makes the next one better. Track execution, risk and psychology in one place.
          </p>
        </motion.div>

        {/* benefit rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", maxWidth: 460 }}>
          {BENEFITS.map(({ icon: Icon, title: t, sub }, i) => (
            <motion.div
              key={t}
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.1, duration: 0.35 }}
              className="jx-card jx-card--flat"
              style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start", padding: "var(--space-4)", background: "color-mix(in srgb, var(--color-bg-surface) 75%, transparent)", backdropFilter: "blur(8px)" }}
            >
              <span className="jx-sect__icon" style={{ width: 34, height: 34, borderRadius: 10 }}>
                <Icon size={16} />
              </span>
              <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ font: "var(--text-body-md)", fontWeight: 600 }}>{t}</span>
                <span style={{ font: "var(--text-small)", color: "var(--color-text-muted)" }}>{sub}</span>
              </span>
            </motion.div>
          ))}
        </div>

        {/* mini stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.35 }}
          style={{ display: "flex", gap: "var(--space-6)", flexWrap: "wrap" }}
        >
          {[
            ["Trades logged", 250000, "+"],
            ["Markets", 40, "+"],
            ["Avg. setup time", 30, "s"],
          ].map(([l, v, suffix]) => (
            <span key={l} style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ font: "var(--text-stat)", letterSpacing: "-1px" }}>
                <CountUp value={v} format={(x) => `${Math.round(x).toLocaleString()}${suffix}`} duration={1.4} />
              </span>
              <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>{l}</span>
            </span>
          ))}
        </motion.div>
      </div>

      {/* ===== Right — form card ===== */}
      <div
        className="jx-auth__right"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-8) var(--space-6)" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="jx-card"
          style={{
            width: "min(430px, 100%)",
            boxShadow: "var(--shadow-lg)",
            borderRadius: "var(--radius-xl)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
          }}
        >
          <div>
            <div style={{ font: "var(--text-h2)" }}>{title}</div>
            {subtitle && (
              <div style={{ font: "var(--text-body)", color: "var(--color-text-muted)" }}>{subtitle}</div>
            )}
          </div>
          {children}
        </motion.div>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          .jx-auth {
            grid-template-columns: 1fr !important;
          }
          .jx-auth__left {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
