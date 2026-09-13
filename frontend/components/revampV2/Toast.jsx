"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

/**
 * revampV2 Toast — glassmorphic, compact, top-center notification.
 * Portalled to <body> so a transformed ancestor (animated cards, modals) can
 * never break its fixed positioning; it always renders at the true viewport top.
 * toast: { type: 'success' | 'danger' | 'info', msg } | null
 * duration: ms the parent keeps it visible (drives the progress bar).
 */
export default function Toast({ toast, duration = 3500 }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!toast) return;
    try { navigator.vibrate?.(toast.type === "danger" ? [12, 40, 12] : 16); } catch {}
  }, [toast]);

  if (!mounted) return null;

  const Icon = toast?.type === "success" ? CheckCircle2 : toast?.type === "danger" ? AlertTriangle : Info;
  const color = toast?.type === "success" ? "#2ebd85" : toast?.type === "danger" ? "#f6465d" : "#fcd535";

  return createPortal(
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.msg}
          initial={{ opacity: 0, y: -16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 440, damping: 30 }}
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            top: "max(18px, env(safe-area-inset-top))",
            left: "50%",
            translate: "-50% 0",
            zIndex: 100000,
            display: "flex",
            alignItems: "center",
            gap: 11,
            padding: "11px 16px 11px 11px",
            borderRadius: 14,
            overflow: "hidden",
            background: "rgba(18,18,20,0.72)",
            backdropFilter: "blur(18px) saturate(160%)",
            WebkitBackdropFilter: "blur(18px) saturate(160%)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
            color: "#fff",
            width: "max-content",
            maxWidth: "min(460px, calc(100vw - 24px))",
          }}
        >
          {/* icon chip */}
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 9, background: `color-mix(in srgb, ${color} 18%, transparent)`, flexShrink: 0 }}>
            <Icon size={16} style={{ color }} />
          </span>
          <span style={{ font: "500 14px/1.35 Poppins, sans-serif", color: "#fff", paddingRight: 2 }}>{toast.msg}</span>

          {/* progress bar */}
          <motion.span
            aria-hidden="true"
            key={`${toast.msg}-bar`}
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: duration / 1000, ease: "linear" }}
            style={{ position: "absolute", left: 0, bottom: 0, height: 2, width: "100%", transformOrigin: "left", background: color, opacity: 0.85 }}
          />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
