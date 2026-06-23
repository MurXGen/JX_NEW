"use client";

/* GetStartedModal — shown to new users right after the acquisition question.
   Nudges the one action that makes the product stick: log a first trade or
   import existing trades. They can also skip. */

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Rocket, Upload, X, Zap } from "lucide-react";

export default function GetStartedModal({ open, onLog, onImport, onSkip }) {
  const cards = [
    { key: "log", icon: Zap, title: "Log your first trade", body: "Drop your net P&L in 10 seconds, or capture full detail. The fastest way to see your analytics.", onClick: onLog, primary: true },
    { key: "import", icon: Upload, title: "Import your trades", body: "Bring in your history from a CSV (quick or detailed template) and get instant analytics.", onClick: onImport },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="jx-modal-overlay jx-modal-overlay--blur"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            className="jx-card"
            style={{ width: "min(520px, 94vw)", padding: "var(--space-6)", position: "relative" }}
          >
            <button
              className="jx-btn jx-btn--secondary jx-btn--sm"
              onClick={onSkip}
              aria-label="Skip"
              style={{ position: "absolute", top: 12, right: 12, padding: 8 }}
            >
              <X size={16} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ width: 40, height: 40, borderRadius: 11, background: "var(--color-primary-subtle)", color: "var(--yellow-500)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Rocket size={20} />
              </span>
              <h2 style={{ font: "var(--text-h2)", margin: 0 }}>You&apos;re in. Let&apos;s add your first trades</h2>
            </div>
            <p style={{ font: "var(--text-body)", color: "var(--color-text-secondary)", margin: "0 0 var(--space-4)" }}>
              Journaling only works if your trades are in it. Pick one to get started, it takes under a minute.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {cards.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={c.onClick}
                  className="jx-card jx-card--flat"
                  style={{
                    display: "flex", alignItems: "center", gap: "var(--space-3)", textAlign: "left",
                    padding: "var(--space-4)", cursor: "pointer", width: "100%",
                    borderColor: c.primary ? "var(--color-primary)" : "var(--color-border)",
                    background: c.primary ? "var(--color-primary-subtle)" : undefined,
                  }}
                >
                  <span style={{ width: 40, height: 40, borderRadius: 11, flexShrink: 0, background: "var(--color-bg-muted)", color: "var(--yellow-500)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <c.icon size={19} />
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                    <span style={{ font: "var(--text-body-md)", fontWeight: 600 }}>{c.title}</span>
                    <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>{c.body}</span>
                  </span>
                  <ArrowRight size={16} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
                </button>
              ))}
            </div>

            <button className="jx-btn jx-btn--ghost" onClick={onSkip} style={{ width: "100%", justifyContent: "center", marginTop: "var(--space-3)" }}>
              Skip for now
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
