"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

/**
 * revampV2 Toast — fixed top-center notification.
 * toast: { type: 'success' | 'danger' | 'info', msg } | null
 */
export default function Toast({ toast }) {
  const Icon =
    toast?.type === "success" ? CheckCircle2 : toast?.type === "danger" ? AlertTriangle : Info;
  const color =
    toast?.type === "success"
      ? "var(--color-success)"
      : toast?.type === "danger"
        ? "var(--color-danger)"
        : "var(--color-primary)";

  // light haptic pulse when a toast appears (supported on most mobile browsers)
  useEffect(() => {
    if (!toast) return;
    try {
      navigator.vibrate?.(toast.type === "danger" ? [12, 40, 12] : 18);
    } catch {}
  }, [toast]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
          className={`jx-toast jx-toast--${toast.type}`}
          style={{
            position: "fixed",
            top: "max(16px, env(safe-area-inset-top))",
            left: "50%",
            translate: "-50% 0",
            zIndex: 2000,
            /* glassmorphic surface with a coloured accent border */
            background: "color-mix(in srgb, var(--color-bg-elevated) 72%, transparent)",
            backdropFilter: "blur(16px) saturate(150%)",
            WebkitBackdropFilter: "blur(16px) saturate(150%)",
            border: "1px solid color-mix(in srgb, #fff 12%, transparent)",
            borderLeft: `3px solid ${color}`,
            color: "var(--color-text-primary)",
            boxShadow: "0 10px 34px rgba(0,0,0,0.32)",
            display: "flex",
            alignItems: "center",
            gap: "clamp(8px, 2.5vw, 12px)",
            /* compact on mobile, comfortably wide on desktop */
            padding: "clamp(10px, 2.6vw, 15px) clamp(14px, 3.6vw, 22px)",
            borderRadius: 14,
            fontSize: "clamp(13px, 3.2vw, 15px)",
            fontWeight: 600,
            width: "max-content",
            minWidth: "min(300px, calc(100vw - 24px))",
            maxWidth: "min(640px, calc(100vw - 24px))",
          }}
        >
          <Icon size={18} style={{ color, flexShrink: 0 }} />
          <span style={{ lineHeight: 1.35 }}>{toast.msg}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
