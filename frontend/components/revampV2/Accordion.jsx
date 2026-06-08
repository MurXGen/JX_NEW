"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

/**
 * revampV2 Accordion — collapsible section persisted to localStorage
 * (`jx-acc-<id>`). Uses the CSS grid-rows trick instead of measured
 * height animation: buttery smooth, no layout shake, and content is
 * fully interactive in both states.
 */
export default function Accordion({ id, title, badge, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    const saved = localStorage.getItem(`jx-acc-${id}`);
    if (saved !== null) setOpen(saved === "1");
  }, [id]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    localStorage.setItem(`jx-acc-${id}`, next ? "1" : "0");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <button
        type="button"
        onClick={toggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          textAlign: "left",
        }}
        aria-expanded={open}
      >
        <span className="jx-card__title">{title}</span>
        {badge}
        <motion.span
          animate={{ rotate: open ? 0 : -90 }}
          transition={{ duration: 0.15 }}
          style={{ display: "flex", color: "var(--color-text-muted)", marginLeft: "auto" }}
        >
          <ChevronDown size={18} />
        </motion.span>
      </button>

      <div className={`jx-acc__content ${open ? "jx-acc__content--open" : ""}`} aria-hidden={!open}>
        <div className="jx-acc__inner" style={{ pointerEvents: open ? "auto" : "none" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
