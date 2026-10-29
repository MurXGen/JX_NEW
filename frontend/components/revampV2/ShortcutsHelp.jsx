"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Keyboard, X } from "lucide-react";
import Kbd, { MOD } from "./Kbd";

/* Global keyboard-shortcuts cheat sheet, opened with "?" from anywhere. */

const GROUPS = [
  {
    title: "Global",
    items: [
      { keys: ["L"], label: "Log a trade" },
      { keys: ["G", "O"], label: "Go to Overview", seq: true },
      { keys: ["G", "T"], label: "Go to Trades log", seq: true },
      { keys: ["G", "M"], label: "Go to Markets", seq: true },
      { keys: ["?"], label: "Show this help" },
    ],
  },
  {
    title: "Trades log",
    items: [
      { keys: ["/"], label: "Focus filters / search" },
    ],
  },
  {
    title: "Dialogs & forms",
    items: [
      { keys: [MOD, "↵"], label: "Save / submit" },
      { keys: ["↵"], label: "Confirm in a dialog" },
      { keys: ["Esc"], label: "Close / cancel" },
    ],
  },
  {
    title: "Screenshot viewer",
    items: [
      { keys: ["←", "→"], label: "Previous / next image", sep: "/" },
      { keys: ["+", "−"], label: "Zoom in / out", sep: "/" },
      { keys: ["Esc"], label: "Close viewer" },
    ],
  },
];

export default function ShortcutsHelp({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="jx-modal-overlay jx-modal-overlay--blur"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{ zIndex: 4200 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            className="jx-ltmodal"
            style={{ width: "min(560px, 96vw)", maxHeight: "86dvh", display: "flex", flexDirection: "column" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="jx-ltmodal__header" style={{ alignItems: "center" }}>
              <span style={{ font: "var(--text-h3)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 8 }}>
                <Keyboard size={18} /> Keyboard shortcuts
              </span>
              <button className="jx-btn jx-btn--secondary jx-btn--sm" onClick={onClose} aria-label="Close" style={{ padding: 8 }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: "var(--space-5) var(--space-6)", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "var(--space-5)", overflowY: "auto" }}>
              {GROUPS.map((g) => (
                <div key={g.title} style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  <span style={{ font: "var(--text-caption)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--color-text-muted)" }}>
                    {g.title}
                  </span>
                  {g.items.map((it) => (
                    <div key={it.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <span style={{ font: "var(--text-body-md)", color: "var(--color-text-secondary)" }}>{it.label}</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                        {it.seq ? (
                          it.keys.map((k, i) => <Kbd key={i} muted={false}>{k}</Kbd>)
                        ) : (
                          <Kbd combo={it.keys} sep={it.sep} muted={false} />
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="jx-ltmodal__footer" style={{ justifyContent: "flex-end" }}>
              <span className="jx-kbd-hint">Press <Kbd>?</Kbd> anytime to open this · <Kbd>Esc</Kbd> to close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
