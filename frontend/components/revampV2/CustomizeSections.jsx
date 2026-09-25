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

const EDGE = 14; // gap kept from the screen edge when snapped

export default function CustomizeSections({ sections, hidden, onToggle, onReset, enabled = true }) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null); // {left, top}
  const [animate, setAnimate] = useState(false); // smooth snap after release
  const [hint, setHint] = useState(false); // "press & hold" tooltip on touch tap
  const drag = useRef(null);
  const longPressRef = useRef(null);

  // clamp a position inside the viewport (keep clear of edges + bottom nav)
  const clamp = (left, top) => {
    if (typeof window === "undefined") return { left, top };
    const maxL = window.innerWidth - FAB - EDGE;
    const maxT = window.innerHeight - FAB - 96; // leave room above bottom nav
    return {
      left: Math.max(EDGE, Math.min(left, maxL)),
      top: Math.max(72, Math.min(top, maxT)),
    };
  };
  // snap horizontally to whichever edge the button is nearer to
  const snapEdge = (left, top) => {
    if (typeof window === "undefined") return { left, top };
    const center = left + FAB / 2;
    const right = window.innerWidth - FAB - EDGE;
    return clamp(center < window.innerWidth / 2 ? EDGE : right, top);
  };

  useEffect(() => {
    setMounted(true);
    let init;
    try {
      const raw = localStorage.getItem(POS_KEY);
      if (raw) init = JSON.parse(raw);
    } catch {}
    if (!init && typeof window !== "undefined") {
      // default: bottom-right, above the mobile bottom nav
      init = { left: window.innerWidth - FAB - EDGE, top: window.innerHeight - FAB - 110 };
    }
    setPos(snapEdge(init?.left ?? 0, init?.top ?? 0));
    const onResize = () => setPos((p) => (p ? snapEdge(p.left, p.top) : p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setAnimate(false);
    setHint(false);
    drag.current = { sx: e.clientX, sy: e.clientY, ox: pos.left, oy: pos.top, moved: false, touch: e.pointerType !== "mouse", opened: false };
    // touch: a press-and-hold opens the sheet (a quick tap shows the hint)
    if (drag.current.touch) {
      clearTimeout(longPressRef.current);
      longPressRef.current = setTimeout(() => {
        if (drag.current && !drag.current.moved) { drag.current.opened = true; setOpen(true); }
      }, 380);
    }
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.sx;
    const dy = e.clientY - drag.current.sy;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      drag.current.moved = true;
      clearTimeout(longPressRef.current); // it's a drag, not a hold
    }
    setPos(clamp(drag.current.ox + dx, drag.current.oy + dy));
  };
  const onPointerUp = () => {
    if (!drag.current) return;
    clearTimeout(longPressRef.current);
    const d = drag.current;
    drag.current = null;
    if (d.moved) {
      setAnimate(true);
      setPos((p) => {
        const snapped = snapEdge(p.left, p.top);
        try { localStorage.setItem(POS_KEY, JSON.stringify(snapped)); } catch {}
        return snapped;
      });
    } else if (d.opened) {
      /* long-press already opened it */
    } else if (!d.touch) {
      setOpen(true); // desktop: a plain click opens
    } else {
      // touch quick tap → hint the user to press & hold
      setHint(true);
      clearTimeout(longPressRef.current);
      longPressRef.current = setTimeout(() => setHint(false), 2400);
    }
  };

  const shown = sections.filter((s) => !hidden.has(s.id)).length;

  useEffect(() => { if (!enabled) setOpen(false); }, [enabled]);

  if (!mounted || !pos || !enabled) return null;

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
          zIndex: 1000, /* above the fixed bottom nav (z-index 900) */
          cursor: "grab",
          touchAction: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border-strong)",
          color: "var(--color-text-primary)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
          transition: animate ? "left 0.28s cubic-bezier(0.22,1,0.36,1), top 0.28s cubic-bezier(0.22,1,0.36,1)" : "none",
        }}
      >
        <SlidersHorizontal size={20} />
      </button>

      {/* "press & hold" hint shown on a quick touch tap */}
      <AnimatePresence>
        {hint && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "fixed",
              top: pos.top + FAB / 2 - 14,
              left: pos.left < window.innerWidth / 2 ? pos.left + FAB + 8 : undefined,
              right: pos.left < window.innerWidth / 2 ? undefined : window.innerWidth - pos.left + 8,
              zIndex: 1001,
              padding: "7px 11px",
              borderRadius: "var(--radius-md)",
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border-strong)",
              boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
              color: "var(--color-text-primary)",
              font: "var(--text-caption)",
              fontWeight: 600,
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            Press &amp; hold to customize
          </motion.div>
        )}
      </AnimatePresence>

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
