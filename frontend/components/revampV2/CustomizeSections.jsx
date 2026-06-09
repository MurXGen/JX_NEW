"use client";

/* Lets users choose which dashboard sections to show/hide. Choice is
   persisted per panel in localStorage. */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Eye, EyeOff, SlidersHorizontal } from "lucide-react";
import Button from "./Button";

export function useHiddenSections(key) {
  const [hidden, setHidden] = useState(() => new Set());

  useEffect(() => {
    try {
      setHidden(new Set(JSON.parse(localStorage.getItem(key) || "[]")));
    } catch {}
  }, [key]);

  const persist = (next) => {
    try { localStorage.setItem(key, JSON.stringify([...next])); } catch {}
  };
  const toggle = (id) =>
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      persist(next);
      return next;
    });
  const reset = () => {
    setHidden(new Set());
    try { localStorage.removeItem(key); } catch {}
  };

  return { hidden, toggle, reset, isVisible: (id) => !hidden.has(id) };
}

export default function CustomizeSections({ sections, hidden, onToggle, onReset }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const shown = sections.filter((s) => !hidden.has(s.id)).length;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <Button variant="outline" size="sm" icon={SlidersHorizontal} onClick={() => setOpen((o) => !o)}>
        Customize
      </Button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="jx-customize-pop"
            style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 6px)",
              zIndex: 60,
              width: 260,
              maxWidth: "calc(100vw - 24px)",
              maxHeight: 360,
              overflowY: "auto",
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-lg)",
              padding: "var(--space-2)",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 8px" }}>
              <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Show sections ({shown}/{sections.length})
              </span>
              <button className="jx-btn jx-btn--ghost jx-btn--sm" style={{ padding: "2px 6px" }} onClick={onReset}>
                Reset
              </button>
            </div>
            {sections.map((s) => {
              const vis = !hidden.has(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  className="jx-dd__option"
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                  onClick={() => onToggle(s.id)}
                >
                  <span
                    style={{
                      width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                      border: `1.5px solid ${vis ? "var(--color-primary)" : "var(--color-border-strong)"}`,
                      background: vis ? "var(--color-primary)" : "transparent",
                      color: "var(--color-primary-foreground)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    {vis && <Check size={12} />}
                  </span>
                  <span style={{ flex: 1, textAlign: "left" }}>{s.label}</span>
                  {vis ? <Eye size={14} style={{ color: "var(--color-text-muted)" }} /> : <EyeOff size={14} style={{ color: "var(--color-text-muted)" }} />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
