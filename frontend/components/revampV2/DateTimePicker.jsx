"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import Button from "./Button";

/**
 * revampV2 DateTimePicker — Figma "Components / Date & Time Picker"
 * (22686:51267). Trigger field opens a calendar + time popover with
 * quick ranges, Cancel/Apply.
 *
 * value: ISO-ish local string "YYYY-MM-DDTHH:mm" (same as datetime-local)
 */
const p2 = (n) => String(n).padStart(2, "0");
const toVal = (d) =>
  `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}`;

export default function DateTimePicker({ value, onChange, placeholder = "Pick date & time" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const initial = value ? new Date(value) : new Date();
  const [month, setMonth] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));
  const [day, setDay] = useState(value ? new Date(value) : null);
  const [time, setTime] = useState(value ? value.slice(11, 16) : "09:30");

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      setDay(d);
      setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
      setTime(value.slice(11, 16));
    }
  }, [value, open]);

  const apply = () => {
    const d = day || new Date();
    const [h, m] = time.split(":").map(Number);
    const out = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h || 0, m || 0);
    onChange(toVal(out));
    setOpen(false);
  };

  const quick = (offsetDays) => {
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    setDay(d);
    setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  };

  const firstDow = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  const daysIn = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const today = new Date();
  const same = (a, b) => a && b && a.toDateString() === b.toDateString();

  const display = value
    ? `${new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} · ${value.slice(11, 16)}`
    : "";

  return (
    <div className="jx-dd" ref={ref}>
      <button
        type="button"
        className="jx-input"
        onClick={() => setOpen((o) => !o)}
        style={{ width: "100%", cursor: "pointer" }}
      >
        <span className="jx-input__icon">
          <CalendarIcon size={15} />
        </span>
        <span
          style={{
            flex: 1,
            textAlign: "left",
            font: "var(--text-body)",
            color: display ? "var(--color-text-primary)" : "var(--color-text-muted)",
            fontWeight: display ? 500 : 400,
          }}
        >
          {display || placeholder}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="jx-dd__panel jx-dtp"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.13 }}
            style={{ padding: "var(--space-3)" }}
          >
            {/* quick ranges */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: "var(--space-2)" }}>
              {[["Today", 0], ["Yesterday", 1]].map(([l, off]) => (
                <button
                  key={l}
                  type="button"
                  className={`jx-chip ${same(day, new Date(Date.now() - off * 864e5)) ? "jx-chip--selected" : ""}`}
                  style={{ padding: "4px 10px", font: "var(--text-caption)" }}
                  onClick={() => quick(off)}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* month nav */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ font: "var(--text-body-md)", fontWeight: 600 }}>
                {month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
              </span>
              <span style={{ display: "flex", gap: 4 }}>
                <button type="button" className="jx-btn jx-btn--secondary jx-btn--sm" style={{ padding: 5 }} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month">
                  <ChevronLeft size={14} />
                </button>
                <button type="button" className="jx-btn jx-btn--secondary jx-btn--sm" style={{ padding: 5 }} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month">
                  <ChevronRight size={14} />
                </button>
              </span>
            </div>

            {/* grid */}
            <div className="jx-dtp__grid">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                <span key={d} className="jx-dtp__dow">{d}</span>
              ))}
              {[...Array(firstDow)].map((_, i) => (
                <span key={`e${i}`} />
              ))}
              {[...Array(daysIn)].map((_, i) => {
                const d = new Date(month.getFullYear(), month.getMonth(), i + 1);
                return (
                  <button
                    key={i}
                    type="button"
                    className={`jx-dtp__day ${same(d, day) ? "jx-dtp__day--selected" : ""} ${same(d, today) && !same(d, day) ? "jx-dtp__day--today" : ""}`}
                    onClick={() => setDay(d)}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            {/* time */}
            <div className="jx-field" style={{ marginTop: "var(--space-2)" }}>
              <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>Time</span>
              <div className="jx-input" style={{ height: 38 }}>
                <span className="jx-input__icon"><Clock size={14} /></span>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>

            {/* footer */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "var(--space-3)", gap: "var(--space-2)" }}>
              <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                {day ? day.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"} · {time}
              </span>
              <span style={{ display: "flex", gap: 8 }}>
                <button type="button" className="jx-btn jx-btn--outline jx-btn--sm" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <Button variant="primary" size="sm" type="button" onClick={apply}>
                  Apply
                </Button>
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
