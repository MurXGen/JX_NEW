"use client";

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

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.18 }}
          className={`jx-toast jx-toast--${toast.type}`}
          style={{
            position: "fixed",
            top: 18,
            left: "50%",
            translate: "-50% 0",
            zIndex: 2000,
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <Icon size={18} style={{ color }} />
          {toast.msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
