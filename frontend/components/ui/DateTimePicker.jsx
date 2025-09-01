import { X } from "lucide-react";
import React, { useEffect, useRef, useState, useMemo } from "react";

export default function DateTimePicker({
  label = "Date & Time",
  value,
  onChange,
  minDate,
  maxDate,
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => (value ? new Date(value) : new Date()));
  const modalRef = useRef(null);

  // Data for wheels
  const years = useMemo(() => {
    const base = new Date().getFullYear();
    return Array.from({ length: 120 }, (_, i) => base - 70 + i);
  }, []);
  const months = useMemo(
    () => [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ],
    []
  );
  const daysInMonth = new Date(draft.getFullYear(), draft.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const activeDay = draft.getDate();
  const activeMonth = draft.getMonth();
  const activeYear = draft.getFullYear();
  const activeH12 = ((draft.getHours() + 11) % 12) + 1;
  const activeMin = draft.getMinutes();
  const activePeriod = draft.getHours() >= 12 ? "PM" : "AM";

  const displayValue = useMemo(() => {
    if (!value) return "";
    const d = new Date(value);
    const h12 = ((d.getHours() + 11) % 12) + 1;
    const ampm = d.getHours() >= 12 ? "PM" : "AM";
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} ${h12}:${mm} ${ampm}`;
  }, [value]);

  // Update helpers
  const setDay = (day) => {
    const next = new Date(draft);
    next.setDate(day);
    setDraft(next);
  };
  const setMonth = (monthIdx) => {
    const next = new Date(draft);
    next.setMonth(monthIdx);
    if (next.getDate() > new Date(next.getFullYear(), monthIdx + 1, 0).getDate()) {
      next.setDate(new Date(next.getFullYear(), monthIdx + 1, 0).getDate());
    }
    setDraft(next);
  };
  const setYear = (year) => {
    const next = new Date(draft);
    next.setFullYear(year);
    setDraft(next);
  };
  const setHour = (h12) => {
    const base = draft.getHours() >= 12 ? 12 : 0;
    const h24 = (h12 % 12) + base;
    const next = new Date(draft);
    next.setHours(h24);
    setDraft(next);
  };
  const setMinute = (m) => {
    const next = new Date(draft);
    next.setMinutes(m);
    setDraft(next);
  };
  const setAmPm = (period) => {
    const h = draft.getHours();
    if (period === "AM" && h >= 12) setHour(((h - 12) || 12));
    if (period === "PM" && h < 12) setHour(h + 12);
  };

  // Apply / Clear
  const apply = () => {
    onChange?.(new Date(draft).toISOString());
    setOpen(false);
  };
  const clear = () => {
    onChange?.(null);
    setDraft(new Date());
    setOpen(false);
  };

  // Close on outside click / Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    const onClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [open]);

  return (
    <div className="dtpRoot">
      <div className="inputLabelShift">
        <label className="dtpLabel">{label}</label>
        <input
          readOnly
          className="dtpInput"
          value={displayValue}
          placeholder="Select date & time"
          onClick={() => setOpen(true)}
        />
      </div>

      {open && (
        <>
          <div className="dtpOverlay" />
          <div className="dtpModal" ref={modalRef}>
            {/* Close */}
            <button type="button" className="closeBtn" onClick={() => setOpen(false)}>
              <X size={20} />
            </button>

            {/* Date Section */}
            <div className="dtpSection">
              <h4>Date</h4>
              <div className="dtpWheels">
                <div className="wheelColumn">
                  {days.map((d) => (
                    <button
                      key={d}
                      className={`wheelItem ${d === activeDay ? "isActive" : ""}`}
                      onClick={() => setDay(d)}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <div className="wheelColumn">
                  {months.map((m, i) => (
                    <button
                      key={m}
                      className={`wheelItem ${i === activeMonth ? "isActive" : ""}`}
                      onClick={() => setMonth(i)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <div className="wheelColumn">
                  {years.map((y) => (
                    <button
                      key={y}
                      className={`wheelItem ${y === activeYear ? "isActive" : ""}`}
                      onClick={() => setYear(y)}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Time Section */}
            <div className="dtpSection">
              <h4>Time</h4>
              <div className="dtpWheels">
                <div className="wheelColumn">
                  {hours.map((h) => (
                    <button
                      key={h}
                      className={`wheelItem ${h === activeH12 ? "isActive" : ""}`}
                      onClick={() => setHour(h)}
                    >
                      {String(h).padStart(2, "0")}
                    </button>
                  ))}
                </div>
                <div className="wheelColumn">
                  {minutes.map((m) => (
                    <button
                      key={m}
                      className={`wheelItem ${m === activeMin ? "isActive" : ""}`}
                      onClick={() => setMinute(m)}
                    >
                      {String(m).padStart(2, "0")}
                    </button>
                  ))}
                </div>
                <div className="wheelColumn">
                  {["AM", "PM"].map((p) => (
                    <button
                      key={p}
                      className={`wheelItem ${p === activePeriod ? "isActive" : ""}`}
                      onClick={() => setAmPm(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <footer className="dtpActions">
              <button className="ghostBtn" onClick={clear}>
                Clear
              </button>
              <button className="primaryBtn" onClick={apply}>
                Apply
              </button>
            </footer>
          </div>
        </>
      )}
    </div>
  );
}
