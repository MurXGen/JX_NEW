"use client";

import { Check } from "lucide-react";

/**
 * revampV2 ChoiceChips — Figma "Choice Chip". Multi or single select.
 * options: string[] · value: string[] | string · onChange
 */
export default function ChoiceChips({ options = [], value, onChange, multi = true }) {
  const selected = multi ? value || [] : [value].filter(Boolean);

  const toggle = (opt) => {
    if (multi) {
      onChange(
        selected.includes(opt)
          ? selected.filter((v) => v !== opt)
          : [...selected, opt],
      );
    } else {
      onChange(opt === value ? null : opt);
    }
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
      {options.map((opt) => {
        const isSel = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            className={`jx-chip ${isSel ? "jx-chip--selected" : ""}`}
            onClick={() => toggle(opt)}
          >
            {isSel && <Check size={14} />}
            {opt}
          </button>
        );
      })}
    </div>
  );
}
