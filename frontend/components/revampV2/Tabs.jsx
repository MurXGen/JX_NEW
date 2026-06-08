"use client";

import { motion } from "framer-motion";

/**
 * revampV2 Tabs — segmented control (Figma "Components / Tabs").
 * items: [{ id, label }] · active: id · onChange(id)
 * Animated active pill via framer-motion layoutId.
 */
export default function Tabs({ items, active, onChange, className = "" }) {
  return (
    <div className={`jx-tabs ${className}`}>
      {items.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className="jx-tabs__item"
          style={{ position: "relative" }}
        >
          {active === id && (
            <motion.span
              layoutId="jx-tab-pill"
              transition={{ type: "spring", stiffness: 500, damping: 38 }}
              style={{
                position: "absolute",
                inset: 0,
                background: "var(--color-bg-surface)",
                borderRadius: "var(--radius-sm)",
                boxShadow: "var(--shadow-sm)",
              }}
            />
          )}
          <span
            style={{
              position: "relative",
              zIndex: 1,
              color:
                active === id
                  ? "var(--color-text-primary)"
                  : "var(--color-text-secondary)",
              fontWeight: active === id ? 600 : 500,
            }}
          >
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}
