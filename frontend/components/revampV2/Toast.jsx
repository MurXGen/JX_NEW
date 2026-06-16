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
            top: 22,
            left: "50%",
            translate: "-50% 0",
            zIndex: 2000,
            boxShadow: "var(--shadow-lg)",
            /* larger, more legible toast */
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "16px 22px",
            borderRadius: 14,
            fontSize: 16,
            fontWeight: 600,
            maxWidth: "min(560px, calc(100vw - 24px))",
          }}
        >
          <Icon size={22} style={{ color, flexShrink: 0 }} />
          <span style={{ lineHeight: 1.35 }}>{toast.msg}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
