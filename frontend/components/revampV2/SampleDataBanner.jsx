"use client";

import { motion } from "framer-motion";
import { Plus, Sparkles, Upload } from "lucide-react";
import Button from "./Button";

/**
 * SampleDataBanner — shown wherever dummy/sample data is rendered.
 * CTAs: log a trade or import trade history.
 */
export default function SampleDataBanner({ onLog, onImport }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="jx-card"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-4)",
        flexWrap: "wrap",
        background: "var(--color-primary-subtle)",
        border: "1px solid var(--color-primary)",
        padding: "var(--space-4) var(--space-5)",
      }}
    >
      <span className="jx-sect__icon" style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0 }}>
        <Sparkles size={17} />
      </span>
      <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 220 }}>
        <span style={{ font: "var(--text-body-md)", fontWeight: 600 }}>
          You&apos;re looking at sample data
        </span>
        <span style={{ font: "var(--text-small)", color: "var(--color-text-secondary)" }}>
          Log your first trade or import your history to see your real performance here.
        </span>
      </span>
      <span style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
        {onImport && (
          <Button variant="outline" size="sm" icon={Upload} onClick={onImport}>
            Import trades
          </Button>
        )}
        {onLog && (
          <Button variant="primary" size="sm" icon={Plus} onClick={onLog}>
            Log a trade
          </Button>
        )}
      </span>
    </motion.div>
  );
}
