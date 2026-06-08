"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Search } from "lucide-react";

/**
 * revampV2 Dropdown — Figma "Dropdowns & Filters" (22683:51248).
 *
 * props:
 *  value, onChange(value)
 *  options: string[] | {value,label}[]
 *  label          — uppercase panel heading
 *  placeholder
 *  searchable     — show search input; typed text can be picked as custom
 *  allowCustom    — pressing Enter / "Use ___" picks free text
 *  leading        — element rendered before the value in the trigger
 *  width          — trigger width (default 100%)
 *  triggerStyle
 */
export default function Dropdown({
  value,
  onChange,
  options = [],
  label,
  placeholder = "Select…",
  searchable = false,
  allowCustom = false,
  leading = null,
  triggerStyle = {},
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const filtered = query
    ? opts.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : opts;
  const current = opts.find((o) => o.value === value);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (v) => {
    onChange(v);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="jx-dd" ref={ref}>
      <button
        type="button"
        className="jx-input"
        onClick={() => setOpen((o) => !o)}
        style={{ width: "100%", cursor: "pointer", justifyContent: "flex-start", ...triggerStyle }}
      >
        {leading}
        <span
          style={{
            flex: 1,
            textAlign: "left",
            font: "var(--text-body)",
            fontWeight: current || value ? 600 : 400,
            color: current || value ? "var(--color-text-primary)" : "var(--color-text-muted)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {current?.label || value || placeholder}
        </span>
        <ChevronDown
          size={15}
          style={{
            color: "var(--color-text-muted)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform .15s ease",
            flexShrink: 0,
          }}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="jx-dd__panel"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.13 }}
          >
            {label && <span className="jx-dd__label">{label}</span>}

            {searchable && (
              <div className="jx-input" style={{ height: 36, marginBottom: "var(--space-2)" }}>
                <span className="jx-input__icon">
                  <Search size={13} />
                </span>
                <input
                  autoFocus
                  placeholder="Search…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && allowCustom && query.trim()) {
                      e.preventDefault();
                      pick(query.trim().toUpperCase());
                    }
                  }}
                />
              </div>
            )}

            {filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`jx-dd__option ${o.value === value ? "jx-dd__option--selected" : ""}`}
                onClick={() => pick(o.value)}
              >
                <span style={{ flex: 1 }}>{o.label}</span>
                {o.value === value && <Check size={14} style={{ color: "var(--yellow-500)" }} />}
              </button>
            ))}

            {allowCustom && query.trim() && !filtered.some((o) => o.label.toLowerCase() === query.trim().toLowerCase()) && (
              <button type="button" className="jx-dd__option" onClick={() => pick(query.trim().toUpperCase())}>
                <span style={{ flex: 1 }}>
                  Use “<strong>{query.trim().toUpperCase()}</strong>”
                </span>
              </button>
            )}

            {filtered.length === 0 && !allowCustom && (
              <span style={{ font: "var(--text-small)", color: "var(--color-text-muted)", padding: "var(--space-2)", display: "block" }}>
                No matches
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
