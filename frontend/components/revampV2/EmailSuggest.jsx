"use client";

/* EmailSuggest — an email input that suggests common domain suffixes as you
   type (like Binance/Bybit). Type "murthy" and pick "murthy@gmail.com".
   Click-only selection so it never interferes with form submit on Enter. */

import { useEffect, useRef, useState } from "react";
import { Mail } from "lucide-react";

const DOMAINS = [
  "gmail.com", "outlook.com", "yahoo.com", "icloud.com",
  "hotmail.com", "proton.me", "live.com", "aol.com",
];

export default function EmailSuggest({
  value = "",
  onChange,
  placeholder = "you@example.com",
  autoComplete = "email",
  autoFocus = false,
  onEnter,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const at = value.indexOf("@");
  const local = at === -1 ? value : value.slice(0, at);
  const domainPart = at === -1 ? null : value.slice(at + 1).toLowerCase();

  const suggestions = (() => {
    if (!local.trim()) return [];
    const doms = domainPart == null ? DOMAINS : DOMAINS.filter((d) => d.startsWith(domainPart));
    return doms.map((d) => `${local}@${d}`).filter((f) => f !== value).slice(0, 5);
  })();

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const show = open && suggestions.length > 0;
  const pick = (s) => {
    onChange(s);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div className="jx-input">
        <span className="jx-input__icon"><Mail size={15} /></span>
        <input
          type="email"
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            else if (e.key === "Enter" && onEnter) { setOpen(false); onEnter(); }
          }}
        />
      </div>

      {show && (
        <div
          className="jx-dd__panel"
          style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 40, maxHeight: 240, overflowY: "auto" }}
          onMouseDown={(e) => e.preventDefault() /* keep input focus */}
        >
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              className="jx-dd__option"
              style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}
              onClick={() => pick(s)}
            >
              <Mail size={13} style={{ opacity: 0.55, flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
