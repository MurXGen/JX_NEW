"use client";

/* Shared dialog frame for the first-run modals. Handles the overlay,
   dialog semantics, Escape, focus on open and reduced motion. On phones it
   becomes a bottom sheet. */

import { useEffect, useId, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import o from "./Onboarding.module.css";

export { o as onbStyles };

export default function OnboardingFrame({ open, onEscape, onClose, closeLabel = "Skip", icon: Icon, kicker, title, lead, children, busy }) {
  const reduce = useReducedMotion();
  const panelRef = useRef(null);
  const titleId = useId();
  const leadId = useId();

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    const t = setTimeout(() => {
      const el = panelRef.current;
      if (!el) return;
      const first = el.querySelector("[data-autofocus]") || el;
      first.focus();
    }, 30);
    const onKey = (e) => {
      if (e.key === "Escape" && onEscape && !busy) onEscape();
      if (e.key === "Tab" && panelRef.current) {
        const f = panelRef.current.querySelectorAll('button:not([disabled]), input, [href], [tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); document.removeEventListener("keydown", onKey); prev?.focus?.(); };
  }, [open, onEscape, busy]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={o.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.18 }}
        >
          <motion.div
            ref={panelRef}
            className={o.panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={lead ? leadId : undefined}
            tabIndex={-1}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 32 }}
          >
            {onClose && (
              <button type="button" className={o.close} onClick={onClose} aria-label={closeLabel} disabled={busy}>
                <X size={16} aria-hidden="true" />
              </button>
            )}
            {Icon && <span className={o.tile} aria-hidden="true"><Icon size={22} strokeWidth={1.6} /></span>}
            {kicker && <span className={o.kicker}>{kicker}</span>}
            <h2 id={titleId} className={o.title}>{title}</h2>
            {lead && <p id={leadId} className={o.lead}>{lead}</p>}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
