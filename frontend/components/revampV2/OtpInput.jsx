"use client";

import { useRef } from "react";

/**
 * OtpInput — 6-box code grid. Auto-advance, backspace navigation,
 * full-code paste support. Fixed-size boxes, centered row.
 * value: string, onChange(string).
 */
export default function OtpInput({ value = "", onChange, length = 6, autoFocus = true }) {
  const refs = useRef([]);
  const chars = [...Array(length)].map((_, i) => value[i] || "");

  const commit = (next) => onChange(next.join("").slice(0, length));

  const handleChange = (i, raw) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return;
    const next = [...chars];
    if (digits.length > 1) {
      /* paste */
      for (let j = 0; j < digits.length && i + j < length; j++) next[i + j] = digits[j];
      commit(next);
      refs.current[Math.min(length - 1, i + digits.length)]?.focus();
    } else {
      next[i] = digits;
      commit(next);
      refs.current[i + 1]?.focus();
    }
  };

  const handleKey = (i, e) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...chars];
      if (next[i]) {
        next[i] = "";
        commit(next);
      } else if (i > 0) {
        next[i - 1] = "";
        commit(next);
        refs.current[i - 1]?.focus();
      }
    }
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < length - 1) refs.current[i + 1]?.focus();
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: 10,
      }}
    >
      {chars.map((c, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={c}
          autoFocus={autoFocus && i === 0}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={6}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          onFocus={(e) => {
            e.target.select();
            e.target.style.borderColor = "var(--color-primary)";
            e.target.style.boxShadow =
              "0 0 0 3px color-mix(in srgb, var(--color-ring) 28%, transparent)";
          }}
          onBlur={(e) => {
            e.target.style.boxShadow = "none";
            e.target.style.borderColor = c
              ? "var(--color-primary)"
              : "var(--color-border-strong)";
          }}
          style={{
            width: 44,
            height: 52,
            flexShrink: 0,
            textAlign: "center",
            font: "600 20px var(--jx-font)",
            color: "var(--color-text-primary)",
            background: "var(--color-bg-surface)",
            border: `1.5px solid ${c ? "var(--color-primary)" : "var(--color-border-strong)"}`,
            borderRadius: "var(--radius-md)",
            outline: "none",
            caretColor: "var(--color-primary)",
            transition: "border-color .15s ease, box-shadow .15s ease",
          }}
        />
      ))}
    </div>
  );
}
