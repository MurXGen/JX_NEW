"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Check, ChevronDown, Search, X } from "lucide-react";

/**
 * revampV2 Dropdown, Figma "Dropdowns & Filters" (22683:51248).
 *
 * The open panel is rendered in a portal with fixed positioning so it always
 * floats above sibling cards/modals, parent containers that create their own
 * stacking context (e.g. backdrop-filter) can no longer clip or cover it.
 *
 * props:
 *  value, onChange(value)
 *  options: string[] | {value,label}[]
 *  label, uppercase panel heading
 *  placeholder
 *  searchable, show search input; typed text can be picked as custom
 *  allowCustom, pressing Enter / "Use ___" picks free text
 *  leading, element rendered before the value in the trigger
 *  triggerStyle
 *  onRemove(value), if set, each option shows an × to delete it
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
  triggerPrefix = null, // e.g. "Direction" → trigger reads "Direction: All"
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [coords, setCoords] = useState(null); // {top,left,width,openUp}
  const [active, setActive] = useState(-1); // keyboard-highlighted option index
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const listId = useId();

  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const filtered = query
    ? opts.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : opts;
  const current = opts.find((o) => o.value === value);

  const close = (refocus = true) => {
    setOpen(false);
    setQuery("");
    if (refocus) triggerRef.current?.focus();
  };

  // highlight the selected option when the panel opens
  useEffect(() => {
    if (open) setActive(Math.max(0, filtered.findIndex((o) => o.value === value)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query]);

  // keep the highlighted option in view while arrowing through a long list
  useEffect(() => {
    if (!open || active < 0) return;
    panelRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  /* ↑ ↓ Home End move · Enter picks · Esc / Tab close */
  const onKeyDown = (e) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    const last = filtered.length - 1;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (i >= last ? 0 : i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (i <= 0 ? last : i - 1)); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(last); }
    else if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "Tab") close(false);
    else if (e.key === "Enter" && active >= 0 && filtered[active]) {
      e.preventDefault();
      pick(filtered[active].value);
    }
  };

  /* position the portal panel against the trigger */
  const place = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const openUp = spaceBelow < 280 && r.top > spaceBelow;
    // keep the whole panel inside the viewport (8px gutter), even when the
    // trigger is near the right edge or partly scrolled out of a filter row
    const vw = window.innerWidth;
    const panelW = Math.min(vw - 16, 360, Math.max(r.width, opts.some((x) => x.hint) ? 256 : 200));
    const left = Math.max(8, Math.min(r.left, vw - panelW - 8));
    setCoords({
      top: openUp ? r.top : r.bottom,
      left,
      width: r.width,
      panelW,
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
    close();
  };

  const panel =
    open && coords ? (
      <motion.div
        ref={panelRef}
        id={listId}
        role="listbox"
        aria-label={label || triggerPrefix || placeholder}
        onKeyDown={onKeyDown}
        className="jx-dd__panel jx-dd__panel--portal"
        initial={{ opacity: 0, y: coords.openUp ? 6 : -6, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.13 }}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          // positioning + sizing only, the look (background, border, radius,
          // shadow, padding) comes from `.jx-dd__panel` so it matches the
          // 3-dot row menu exactly.
          position: "fixed",
          top: coords.openUp ? "auto" : coords.top + 6,
          bottom: coords.openUp ? window.innerHeight - coords.top + 6 : "auto",
          left: coords.left,
          right: "auto",
          width: coords.panelW, /* trigger width or wider, clamped to the screen */
          maxWidth: "calc(100vw - 16px)",
          maxHeight: 300,
          overflowY: "auto",
          overflowX: "hidden",
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
                // with no matching option, Enter uses the typed text; otherwise
                // it falls through to the list handler and picks the highlight
                if (e.key === "Enter" && allowCustom && query.trim() && filtered.length === 0) {
                  e.preventDefault();
                  e.stopPropagation();
                  pick(query.trim().toUpperCase());
                }
              }}
            />
          </div>
        )}

        {filtered.map((o, i) => (
          <div
            key={o.value}
            data-idx={i}
            role="option"
            aria-selected={o.value === value}
            className={`jx-dd__option ${o.value === value ? "jx-dd__option--selected" : ""} ${i === active ? "jx-dd__option--active" : ""}`}
            style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
            onMouseEnter={() => setActive(i)}
            onClick={() => pick(o.value)}
          >
            {/* optional icon + one-line hint: { value, label, icon, hint } */}
            {o.icon && <span className="jx-dd__ico" aria-hidden="true"><o.icon size={14} /></span>}
            <span className="jx-dd__txt" style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {o.label}
              {o.hint && <small className="jx-dd__hint">{o.hint}</small>}
            </span>
            {o.value === value && <Check size={14} className="jx-dd__check" style={{ flexShrink: 0 }} />}
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
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
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
          {triggerPrefix && (current || value)
            ? <><span className="jx-dd__prefix">{triggerPrefix}</span> {current?.label ?? value}</>
            : current?.label || value || placeholder}
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

      {typeof document !== "undefined" && panel && createPortal(panel, document.body)}
    </div>
  );
}
