"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * App-like opening screen, shown only when JournalX is launched as an
 * installed PWA (display-mode: standalone). Renders once per app launch
 * (session-scoped), then fades away — so route changes don't replay it.
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
    const t = setTimeout(() => setShow(false), 1700);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="jx-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, ease: "easeInOut" }}
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            background:
              "radial-gradient(140% 120% at 50% 18%, #2a2a2e 0%, #1d1d1d 46%, #121214 100%)",
          }}
        >
          {/* soft moving gold glow */}
          <motion.div
            initial={{ opacity: 0.35, scale: 0.9 }}
            animate={{ opacity: [0.35, 0.6, 0.35], scale: [0.9, 1.08, 0.9] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute",
              top: "30%",
              width: 460,
              height: 460,
              borderRadius: "50%",
              filter: "blur(70px)",
              background:
                "radial-gradient(circle, rgba(252,213,53,0.45) 0%, rgba(240,185,11,0.18) 45%, transparent 70%)",
            }}
          />

          {/* wordmark */}
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 22, delay: 0.05 }}
            style={{ position: "relative", zIndex: 1 }}
          >
            <span
              style={{
                fontFamily: "'Poppins', system-ui, sans-serif",
                fontWeight: 700,
                fontSize: "clamp(40px, 12vw, 64px)",
                letterSpacing: "-0.02em",
                color: "#f5f5f5",
                position: "relative",
                display: "inline-block",
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
              {/* shimmer sweep */}
              <motion.span
                initial={{ x: "-120%" }}
                animate={{ x: "120%" }}
                transition={{ duration: 1.1, ease: "easeInOut", delay: 0.35 }}
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.55) 50%, transparent 65%)",
                  mixBlendMode: "overlay",
                  pointerEvents: "none",
                }}
              />
            </span>
          </motion.div>

          {/* tagline */}
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            style={{
              marginTop: 10,
              fontFamily: "'Poppins', system-ui, sans-serif",
              fontSize: 13,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#9a9aa2",
              zIndex: 1,
            }}
          >
            Trade. Review. Improve.
          </motion.span>

          {/* loading dots */}
          <div style={{ display: "flex", gap: 7, marginTop: 34, zIndex: 1 }}>
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0.25, y: 0 }}
                animate={{ opacity: [0.25, 1, 0.25], y: [0, -4, 0] }}
                transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
                style={{ width: 7, height: 7, borderRadius: "50%", background: "#fcd535" }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
