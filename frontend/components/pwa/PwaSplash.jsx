"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * App-like opening loader, shown only when JournalX is launched as an
 * installed PWA (display-mode: standalone). Renders once per app launch
 * (session-scoped), then fades away — so route changes don't replay it.
 *
 * Clean, UltraTrader-style: centered wordmark + a quiet spinner, on a
 * background that adapts to the active theme (white in light, dark in dark)
 * via CSS theme variables.
 */
export default function PwaSplash() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    if (!standalone) return;

    let alreadyShown = false;
    try {
      alreadyShown = sessionStorage.getItem("jx-splash-shown") === "1";
    } catch {}
    if (alreadyShown) return;

    try {
      sessionStorage.setItem("jx-splash-shown", "1");
    } catch {}

    setShow(true);
    const t = setTimeout(() => setShow(false), 1600);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="jx-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 36,
            background: "var(--color-bg-canvas, #0d1117)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          {/* wordmark */}
          <motion.span
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 240, damping: 22 }}
            style={{
              fontFamily: "'Poppins', system-ui, sans-serif",
              fontWeight: 700,
              fontSize: "clamp(34px, 9vw, 52px)",
              letterSpacing: "-0.02em",
              color: "var(--color-text-primary, #eaecef)",
              lineHeight: 1,
            }}
          >
            Journal
            <span
              style={{
                background: "linear-gradient(135deg, #fcd535 0%, #f0b90b 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                color: "#fcd535",
              }}
            >
              X
            </span>
          </motion.span>

          {/* quiet spinner */}
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.85, ease: "linear" }}
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              border: "3px solid color-mix(in srgb, var(--color-text-primary, #888) 16%, transparent)",
              borderTopColor: "#f0b90b",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
