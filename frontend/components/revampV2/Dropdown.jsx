"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Search, X } from "lucide-react";

/**
 * revampV2 Dropdown — Figma "Dropdowns & Filters" (22683:51248).
 *
 * The open panel is rendered in a portal with fixed positioning so it always
 * floats above sibling cards/modals — parent containers that create their own
 * stacking context (e.g. backdrop-filter) can no longer clip or cover it.
 *
 * props:
 *  value, onChange(value)
 *  options: string[] | {value,label}[]
 *  label          — uppercase panel heading
 *  placeholder
 *  searchable     — show search input; typed text can be picked as custom
 *  allowCustom    — pressing Enter / "Use ___" picks free text
 *  leading        — element rendered before the value in the trigger
 *  triggerStyle
 *  onRemove(value) — if set, each option shows an × to delete it
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
  onRemove = null,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [coords, setCoords] = useState(null); // {top,left,width,openUp}
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const filtered = query
    ? opts.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : opts;
  const current = opts.find((o) => o.value === value);

  /* position the portal panel against the trigger */
  const place = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const openUp = spaceBelow < 280 && r.top > spaceBelow;
    setCoords({
      top: openUp ? r.top : r.bottom,
      left: r.left,
      width: r.width,
      openUp,
    });
  };

  useLayoutEffect(() => {
    if (open) place();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onMove = () => place();
    // capture scroll on any ancestor (modal bodies scroll independently)
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    const onDoc = (e) => {
      if (wrapRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
      document.removeEventListener("mousedown", onDoc);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const pick = (v) => {
    onChange(v);
    setOpen(false);
    setQuery("");
  };

  const panel =
    open && coords ? (
      <motion.div
        ref={panelRef}
        className="jx-dd__panel jx-dd__panel--portal"
        initial={{ opacity: 0, y: coords.openUp ? 6 : -6, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: coords.openUp ? 6 : -6, scale: 0.98 }}
        transition={{ duration: 0.13 }}
        style={{
          position: "fixed",
          top: coords.openUp ? "auto" : coords.top + 6,
          bottom: coords.openUp ? window.innerHeight - coords.top + 6 : "auto",
          left: coords.left,
          right: "auto",
          width: coords.width,
          minWidth: coords.width,
          zIndex: 4000,
        }}
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
          <div
            key={o.value}
            className={`jx-dd__option ${o.value === value ? "jx-dd__option--selected" : ""}`}
            style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
            onClick={() => pick(o.value)}
          >
            <span style={{ flex: 1 }}>{o.label}</span>
            {o.value === value && <Check size={14} style={{ color: "var(--yellow-500)" }} />}
            {onRemove && (
              <span
                role="button"
                aria-label={`Remove ${o.label}`}
                title={`Remove ${o.label}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(o.value);
                }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                  color: "var(--color-text-muted)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-muted)"; e.currentTarget.style.color = "var(--color-danger)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
              >
                <X size={13} />
              </span>
            )}
          </div>
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
    ) : null;

  return (
    <div className="jx-dd" ref={wrapRef}>
      <button
        ref={triggerRef}
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

      {typeof document !== "undefined" && (
        <AnimatePresence>{panel && createPortal(panel, document.body)}</AnimatePresence>
      )}
    </div>
  );
}
