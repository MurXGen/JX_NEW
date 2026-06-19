"use client";

/* NotificationOptInModal — a designed opt-in (not the raw browser prompt).
   The user opts in here first; only then do we trigger the real permission
   request, so the browser prompt arrives with context and a much higher
   accept rate. Once granted we schedule per-session "log your trades" nudges. */

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, BellRing, Check, X } from "lucide-react";
import { enableNotifications, notifPermission, SESSION_STARTS } from "@/utils/sessionNotify";

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

const fmtHour = (h) => {
  // show the session start in the viewer's local time
  const d = new Date();
  d.setUTCHours(h, 0, 0, 0);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export default function NotificationOptInModal({ open, onClose, onEnabled }) {
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);

  const handleEnable = async () => {
    setBusy(true);
    const perm = await enableNotifications();
    setBusy(false);
    if (perm === "granted") {
      onEnabled?.();
      onClose?.();
    } else {
      // blocked or dismissed — surface guidance instead of silently failing
      setDenied(true);
    }
  };

  const blocked = denied || notifPermission() === "denied";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="jx-modal-overlay jx-modal-overlay--blur"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose?.()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            className="jx-card"
            style={{
              width: "min(440px, 94vw)",
              padding: "var(--space-6)",
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* ambient glow */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute", inset: "-40% 20% auto 20%", height: 180,
                background: "radial-gradient(60% 100% at 50% 0%, color-mix(in srgb, var(--color-primary) 35%, transparent), transparent 70%)",
                filter: "blur(20px)", pointerEvents: "none",
              }}
            />
            <button
              className="jx-btn jx-btn--secondary jx-btn--sm"
              onClick={() => !busy && onClose?.()}
              aria-label="Close"
              style={{ position: "absolute", top: 12, right: 12, padding: 8 }}
            >
              <X size={16} />
            </button>

            {/* icon */}
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: [0, -12, 12, -8, 8, 0] }}
              transition={{ duration: 1.1, delay: 0.2 }}
              style={{
                width: 64, height: 64, borderRadius: "50%", margin: "4px auto var(--space-3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "var(--color-primary-subtle)", color: "var(--yellow-500)",
                position: "relative", zIndex: 1,
              }}
            >
              <BellRing size={30} />
            </motion.div>

            <h2 style={{ font: "var(--text-h2)", margin: "0 0 6px", position: "relative", zIndex: 1 }}>
              Never miss a session
            </h2>
            <p style={{ font: "var(--text-body)", color: "var(--color-text-secondary)", margin: "0 0 var(--space-4)", position: "relative", zIndex: 1 }}>
              Get a gentle nudge to log your trades and review your plan the moment
              each market session opens.
            </p>

            {/* session chips */}
            <div
              style={{
                display: "flex", flexWrap: "wrap", gap: "var(--space-2)", justifyContent: "center",
                marginBottom: "var(--space-4)", position: "relative", zIndex: 1,
              }}
            >
              {SESSION_STARTS.map((s) => (
                <span
                  key={s.name}
                  className="jx-chip"
                  style={{ cursor: "default", gap: 6 }}
                >
                  <Bell size={12} /> {s.name.replace(" session", "")} · {fmtHour(s.h)}
                </span>
              ))}
            </div>

            {blocked ? (
              <div
                className="jx-banner"
                style={{ background: "var(--color-danger-subtle)", textAlign: "left", marginBottom: "var(--space-4)", position: "relative", zIndex: 1 }}
              >
                <X size={15} style={{ color: "var(--color-danger)", flexShrink: 0, marginTop: 2 }} />
                <span style={{ font: "var(--text-caption)" }}>
                  Notifications are blocked for this site. Turn them on from your
                  browser&apos;s site settings (the lock icon in the address bar),
                  then come back and enable here.
                </span>
              </div>
            ) : (
              <p style={{ font: "var(--text-caption)", color: "var(--color-text-muted)", margin: "0 0 var(--space-4)", position: "relative", zIndex: 1 }}>
                Reminders fire on this device while JournalX is open — one per
                session, no spam. You can turn them off anytime in Settings.
              </p>
            )}

            <div style={{ display: "flex", gap: "var(--space-2)", position: "relative", zIndex: 1 }}>
              <button
                className="jx-btn jx-btn--ghost"
                onClick={() => !busy && onClose?.()}
                style={{ flex: 1, justifyContent: "center" }}
                disabled={busy}
              >
                Maybe later
              </button>
              {!blocked && (
                <button
                  className="jx-btn jx-btn--primary"
                  onClick={handleEnable}
                  disabled={busy}
                  style={{ flex: 1.4, justifyContent: "center" }}
                >
                  {busy ? <><Spinner /> Enabling…</> : <><Check size={16} /> Enable notifications</>}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
