"use client";

/* QuickFillChips — tappable chips that prefill a numeric field (position size,
   P&L, …). Ships a few defaults; users can add their own with "+ Custom",
   which persist in localStorage and can be removed with the × on the chip.
   Wraps responsively. */

import { useEffect, useState } from "react";
import { Check, Plus, X } from "lucide-react";

const readCustom = (key) => {
  try {
    const r = JSON.parse(localStorage.getItem(key) || "null");
    return Array.isArray(r) ? r.map(String) : [];
  } catch {
    return [];
  }
};
const writeCustom = (key, list) => {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {}
};

export default function QuickFillChips({
  value,
  onPick,
  defaults = [],
  storageKey,
  prefix = "",
  allowNegative = false,
}) {
  const [custom, setCustom] = useState([]);
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    setCustom(readCustom(storageKey));
  }, [storageKey]);

  const defStr = defaults.map(String);
  const all = [...defStr, ...custom.filter((c) => !defStr.includes(c))];
  const isCustom = (v) => custom.includes(v) && !defStr.includes(v);
  const label = (v) => `${prefix}${Number(v).toLocaleString(undefined, { maximumFractionDigits: 8 })}`;

  const commit = () => {
    const raw = text.trim();
    setText("");
    setAdding(false);
    if (!raw) return;
    const n = Number(raw);
    if (!Number.isFinite(n) || (!allowNegative && n < 0)) return;
    const v = String(n);
    if (!defStr.includes(v) && !custom.includes(v)) {
      const next = [...custom, v];
      setCustom(next);
      writeCustom(storageKey, next);
    }
    onPick(v);
  };

  const remove = (v) => {
    const next = custom.filter((c) => c !== v);
    setCustom(next);
    writeCustom(storageKey, next);
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", alignItems: "center" }}>
      {all.map((v) => {
        const selected = String(value) === v;
        const removable = isCustom(v);
        return (
          <span
            key={v}
            role="button"
            tabIndex={0}
            className={`jx-chip ${selected ? "jx-chip--selected" : ""}`}
            style={{ cursor: "pointer", paddingRight: removable ? 6 : undefined }}
            onClick={() => onPick(v)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onPick(v))}
          >
            {selected && <Check size={13} />}
            {label(v)}
            {removable && (
              <span
                role="button"
                aria-label={`Remove ${label(v)}`}
                title="Remove"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(v);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginLeft: 4,
                  width: 18,
                  height: 18,
                  borderRadius: 5,
                  color: "var(--color-text-muted)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--color-bg-muted)";
                  e.currentTarget.style.color = "var(--color-danger)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--color-text-muted)";
                }}
              >
                <X size={12} />
              </span>
            )}
          </span>
        );
      })}

      {adding ? (
        <span className="jx-input" style={{ height: 32, width: 124 }}>
          <input
            autoFocus
            type="number"
            step="any"
            placeholder={allowNegative ? "e.g. -250" : "e.g. 1.5"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), commit())}
            onBlur={commit}
          />
        </span>
      ) : (
        <button
          type="button"
          className="jx-chip"
          style={{ borderStyle: "dashed" }}
          onClick={() => setAdding(true)}
        >
          <Plus size={13} /> Custom
        </button>
      )}
    </div>
  );
}
