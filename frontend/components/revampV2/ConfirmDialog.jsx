"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Download, Trash2, X } from "lucide-react";

/* Figma "Components / Modal" (22663:51006) — confirmation dialog with
   blurred backdrop, icon, title, message, Cancel + action button. */

function Spinner() {
  return (
    <motion.span
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
      style={{
        width: 14, height: 14, borderRadius: "50%", display: "inline-block",
        border: "2px solid color-mix(in srgb, currentColor 30%, transparent)",
        borderTopColor: "currentColor",
      }}
    />
  );
}

/**
 * props:
 *  open, onClose, onConfirm (may be async — spinner shows while pending)
 *  title, message
 *  confirmLabel, variant: 'danger' | 'primary'
 *  icon — defaults by variant (Trash2 for danger, Download otherwise)
 *  loading — controlled busy state
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  variant = "primary",
  icon: Icon,
  loading = false,
}) {
  const ActionIcon = Icon || (variant === "danger" ? Trash2 : Download);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="jx-modal-overlay jx-modal-overlay--blur"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{ zIndex: 1500 }}
          onMouseDown={(e) => e.target === e.currentTarget && !loading && onClose?.()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="jx-ltmodal"
            style={{ width: "min(420px, 94vw)" }}
          >
            <div style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-3)" }}>
                <span
                  style={{
                    width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: variant === "danger" ? "var(--color-danger-subtle)" : "var(--color-primary-subtle)",
                    color: variant === "danger" ? "var(--color-danger)" : "var(--yellow-500)",
                  }}
                >
                  {variant === "danger" ? <AlertTriangle size={18} /> : <ActionIcon size={18} />}
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                  <span style={{ font: "var(--text-h3)", fontWeight: 600 }}>{title}</span>
                  <span style={{ font: "var(--text-body)", color: "var(--color-text-muted)" }}>{message}</span>
                </div>
                <button className="jx-btn jx-btn--secondary jx-btn--sm" onClick={onClose} disabled={loading} aria-label="Close" style={{ padding: 7 }}>
                  <X size={14} />
                </button>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)" }}>
                <button className="jx-btn jx-btn--outline" onClick={onClose} disabled={loading}>
                  Cancel
                </button>
                <button
                  className={`jx-btn ${variant === "danger" ? "jx-btn--danger" : "jx-btn--primary"}`}
                  onClick={onConfirm}
                  disabled={loading}
                  style={{ minWidth: 120 }}
                >
                  {loading ? <Spinner /> : <ActionIcon size={15} />} {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
