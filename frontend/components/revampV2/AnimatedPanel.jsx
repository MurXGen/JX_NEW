"use client";

import { motion, AnimatePresence } from "framer-motion";

/**
 * revampV2 AnimatedPanel — wraps tab content so switching tabs
 * cross-fades + slides. Key it by the active tab id.
 *
 * <AnimatedPanel id={activeTab}> {content} </AnimatedPanel>
 */
export default function AnimatedPanel({ id, children }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        style={{ minHeight: 0, display: "flex", flexDirection: "column", gap: "var(--space-6)" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
