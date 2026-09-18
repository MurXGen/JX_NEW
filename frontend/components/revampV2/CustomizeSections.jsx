"use client";

/* Lets users choose which dashboard sections to show/hide. Choice is
   persisted per panel in localStorage.

   The trigger is a floating, draggable button (default: right edge of the
   screen). The user can drag it anywhere; a tap opens the section picker as a
   bottom slide-up sheet. Its position is remembered across sessions. */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Eye, EyeOff, SlidersHorizontal } from "lucide-react";

export function useHiddenSections(key, defaultHidden = []) {
  const [hidden, setHidden] = useState(() => new Set(defaultHidden));

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      // No saved choice yet → apply the default-hidden set. Once the user
      // customizes, their saved choice (including re-enabled sections) wins.
      setHidden(raw == null ? new Set(defaultHidden) : new Set(JSON.parse(raw)));
    } catch {
      setHidden(new Set(defaultHidden));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setHidden(new Set(defaultHidden));
    try { localStorage.removeItem(key); } catch {}
  };

  return { hidden, toggle, reset, isVisible: (id) => !hidden.has(id) };
}

const FAB = 52;         // button diameter
const POS_KEY = "jx-customize-fab-pos";

export default function CustomizeSections({ sections, hidden, onToggle, onReset }) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null); // {left, top}
  const drag = useRef(null);

  // clamp a position inside the viewport (keep clear of edges + bottom nav)
  const clamp = (left, top) => {
    if (typeof window === "undefined") return { left, top };
    const maxL = window.innerWidth - FAB - 8;
    const maxT = window.innerHeight - FAB - 84; // leave room above bottom nav
    return {
      left: Math.max(8, Math.min(left, maxL)),
      top: Math.max(72, Math.min(top, maxT)),
    };
  };

  useEffect(() => {
    setMounted(true);
    let init;
    try {
      const raw = localStorage.getItem(POS_KEY);
      if (raw) init = JSON.parse(raw);
    } catch {}
    if (!init && typeof window !== "undefined") {
      init = { left: window.innerWidth - FAB - 12, top: Math.round(window.innerHeight * 0.42) };
    }
    setPos(clamp(init?.left ?? 0, init?.top ?? 0));
    const onResize = () => setPos((p) => (p ? clamp(p.left, p.top) : p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { sx: e.clientX, sy: e.clientY, ox: pos.left, oy: pos.top, moved: false };
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.sx;
    const dy = e.clientY - drag.current.sy;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) drag.current.moved = true;
    setPos(clamp(drag.current.ox + dx, drag.current.oy + dy));
  };
  const onPointerUp = () => {
    if (!drag.current) return;
    const moved = drag.current.moved;
    drag.current = null;
    if (moved) {
      try { localStorage.setItem(POS_KEY, JSON.stringify(pos)); } catch {}
    } else {
      setOpen(true); // treat as a tap
    }
  };

  const shown = sections.filter((s) => !hidden.has(s.id)).length;

  if (!mounted || !pos) return null;

  return createPortal(
    <>
      {/* floating draggable trigger */}
      <button
        type="button"
        aria-label="Customize sections"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          position: "fixed",
          left: pos.left,
          top: pos.top,
          width: FAB,
          height: FAB,
          borderRadius: "50%",
          zIndex: 900,
          cursor: "grab",
          touchAction: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border-strong)",
          color: "var(--color-text-primary)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
        }}
      >
        <SlidersHorizontal size={20} />
      </button>

      {/* bottom slide-up sheet */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 1400, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: 520,
                maxHeight: "80dvh",
                display: "flex",
                flexDirection: "column",
                background: "var(--color-bg-elevated)",
                borderTopLeftRadius: "var(--radius-xl)",
                borderTopRightRadius: "var(--radius-xl)",
                borderTop: "1px solid var(--color-border)",
                boxShadow: "0 -14px 44px rgba(0,0,0,0.45)",
                paddingBottom: "env(safe-area-inset-bottom)",
              }}
            >
              <div style={{ width: 40, height: 4, borderRadius: 999, background: "var(--color-border-strong)", margin: "10px auto 4px" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px var(--space-5) 4px" }}>
                <span style={{ font: "var(--text-h3)", fontWeight: 600 }}>Customize dashboard</span>
                <button className="jx-btn jx-btn--ghost jx-btn--sm" onClick={onReset}>Reset</button>
              </div>
              <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)", padding: "0 var(--space-5) var(--space-2)" }}>
                Showing {shown} of {sections.length} sections
              </span>
              <div style={{ overflowY: "auto", padding: "0 var(--space-3) var(--space-4)", display: "flex", flexDirection: "column", gap: 2 }}>
                {sections.map((s) => {
                  const vis = !hidden.has(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className="jx-dd__option"
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 10px" }}
                      onClick={() => onToggle(s.id)}
                    >
                      <span
                        style={{
                          width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                          border: `1.5px solid ${vis ? "var(--color-primary)" : "var(--color-border-strong)"}`,
                          background: vis ? "var(--color-primary)" : "transparent",
                          color: "var(--color-primary-foreground)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >
                        {vis && <Check size={13} />}
                      </span>
                      <span style={{ flex: 1, textAlign: "left", font: "var(--text-body-md)" }}>{s.label}</span>
                      {vis ? <Eye size={16} style={{ color: "var(--color-text-muted)" }} /> : <EyeOff size={16} style={{ color: "var(--color-text-muted)" }} />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body,
  );
}
