"use client";

/* Calm, branded splash shown briefly while a trade saves — replaces the
   interactive game loader. Just a soft spinner + label, no distractions. */

import { motion } from "framer-motion";

export default function SplashLoader({ label = "Saving…" }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-4)",
        background: "color-mix(in srgb, var(--color-bg-canvas) 82%, transparent)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        borderRadius: "inherit",
      }}
    >
      <div style={{ position: "relative", width: 54, height: 54 }}>
        {/* track */}
        <span
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: "3px solid color-mix(in srgb, var(--color-primary) 18%, transparent)",
          }}
        />
        {/* spinner */}
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: "3px solid transparent",
            borderTopColor: "var(--color-primary)",
            borderRightColor: "var(--color-primary)",
          }}
        />
        {/* brand mark */}
        <span
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            font: "800 20px Poppins, sans-serif",
            color: "var(--color-primary)",
          }}
        >
          X
        </span>
      </div>
      <motion.span
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
        style={{ font: "var(--text-body-md)", fontWeight: 600, color: "var(--color-text-secondary)" }}
      >
        {label}
      </motion.span>
    </motion.div>
  );
}
