import { ChevronLeft, ChevronRight, X } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";

export default function DateTimePicker({
  label = "Date & Time",
  value,
  onChange,
  minDate,
  maxDate,
}) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => (value ? new Date(value) : new Date()));
  const [draft, setDraft] = useState(() => (value ? new Date(value) : new Date()));
  const [viewMode, setViewMode] = useState("date"); // 'date' | 'month' | 'year'
  const modalRef = useRef(null);

  const years = useMemo(() => {
    const base = new Date().getFullYear();
    const start = base - 70;
    return Array.from({ length: 120 }, (_, i) => start + i);
  }, []);

  const months = useMemo(
    () => ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    []
  );

  const displayValue = useMemo(() => {
    if (!value) return "";
    const d = new Date(value);
    const h12 = ((d.getHours() + 11) % 12) + 1;
    const ampm = d.getHours() >= 12 ? "PM" : "AM";
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${d.toLocaleDateString()} ${h12}:${mm} ${ampm}`;
  }, [value]);

  const firstDayOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const startOffset = (firstDayOfMonth.getDay() + 7) % 7; // 0=Sun
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();

  const grid = useMemo(() => {
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    // pad to full weeks (6 rows)
    while (cells.length % 7 !== 0) cells.push(null);
    if (cells.length < 42) while (cells.length < 42) cells.push(null);
    return cells;
  }, [startOffset, daysInMonth]);

  const isDisabledDate = (y, m, d) => {
    const dt = new Date(y, m, d, draft.getHours(), draft.getMinutes());
    if (minDate && dt < new Date(minDate)) return true;
    if (maxDate && dt > new Date(maxDate)) return true;
    return false;
  };

  const handleDayClick = (d) => {
    if (!d) return;
    if (isDisabledDate(viewMonth.getFullYear(), viewMonth.getMonth(), d)) return;
    const next = new Date(draft);
    next.setFullYear(viewMonth.getFullYear());
    next.setMonth(viewMonth.getMonth());
    next.setDate(d);
    setDraft(next);
  };

  const changeMonth = (delta) => {
    const next = new Date(viewMonth);
    next.setMonth(viewMonth.getMonth() + delta);
    setViewMonth(next);
  };

  const setHour = (h24) => {
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
    const isPm = h >= 12;
    if (period === "AM" && isPm) setHour(h - 12);
    if (period === "PM" && !isPm) setHour(h + 12);
  };

  const apply = () => {
    onChange?.(new Date(draft).toISOString());
    setOpen(false);
  };

  const clear = () => {
    onChange?.(null);
    setDraft(new Date());
    setViewMonth(new Date());
  };

  const setToday = () => {
    const now = new Date();
    setDraft(now);
    setViewMonth(now);
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

  // Time wheels data
  const hours = useMemo(() => Array.from({ length: 12 }, (_, i) => (i + 1)), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);
  const activeH12 = ((draft.getHours() + 11) % 12) + 1;
  const activeMin = draft.getMinutes();
  const activePeriod = draft.getHours() >= 12 ? "PM" : "AM";

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
          <div
            className="dtpModal"
            role="dialog"
            aria-modal="true"
            ref={modalRef}
          >
            {/* Close Button */}
            <button
              type="button"
              className="closeBtn button_ter "
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              <X size={20} />
            </button>

            {/* Header */}
            <header className="dtpHeader">
              <button
                type="button"
                className="iconBtn"
                onClick={() => changeMonth(-1)}
                aria-label="Previous month"
              >
                <ChevronLeft size={20} />
              </button>

              <div className="dtpHeaderCenter">
                <button
                  type="button"
                  className="linkBtn"
                  onClick={() => setViewMode("year")}
                >
                  {viewMonth.getFullYear()}
                </button>
                <button
                  type="button"
                  className="linkBtn"
                  onClick={() => setViewMode("month")}
                >
                  {months[viewMonth.getMonth()]}
                </button>
              </div>

              <button
                type="button"
                className="iconBtn"
                onClick={() => changeMonth(1)}
                aria-label="Next month"
              >
                <ChevronRight size={20} />
              </button>
            </header>

            {/* Date Grid */}
            {viewMode === "date" && (
              <>
                <div className="dtpWeekRow">
                  {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
                    <div key={d} className="dtpWeekday">
                      {d}
                    </div>
                  ))}
                </div>

                <div className="dtpGrid">
                  {grid.map((d, idx) => {
                    if (!d)
                      return <div className="dtpCell dtpCellEmpty" key={idx} />;
                    const y = viewMonth.getFullYear();
                    const m = viewMonth.getMonth();
                    const isToday =
                      d === new Date().getDate() &&
                      m === new Date().getMonth() &&
                      y === new Date().getFullYear();
                    const isSelected =
                      d === draft.getDate() &&
                      m === draft.getMonth() &&
                      y === draft.getFullYear();
                    const disabled = isDisabledDate(y, m, d);

                    const cls = [
                      "dtpCell",
                      isToday ? "isToday" : "",
                      isSelected ? "isSelected" : "",
                      disabled ? "isDisabled" : "",
                    ].join(" ");

                    return (
                      <button
                        type="button"
                        key={idx}
                        className={cls}
                        onClick={() => handleDayClick(d)}
                        disabled={disabled}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>

                {/* Time Wheels */}
                <div className="dtpWheels">
                  <div className="wheelColumn" role="listbox" aria-label="Hour">
                    {hours.map((h) => (
                      <button
                        type="button"
                        key={h}
                        className={`wheelItem ${h === activeH12 ? "isActive" : ""
                          }`}
                        onClick={() => {
                          const base = draft.getHours() >= 12 ? 12 : 0;
                          const h24 = (h % 12) + base;
                          setHour(h24);
                        }}
                      >
                        {String(h).padStart(2, "0")}
                      </button>
                    ))}
                  </div>

                  <div className="wheelColumn" role="listbox" aria-label="Minute">
                    {minutes.map((m) => (
                      <button
                        type="button"
                        key={m}
                        className={`wheelItem ${m === activeMin ? "isActive" : ""
                          }`}
                        onClick={() => setMinute(m)}
                      >
                        {String(m).padStart(2, "0")}
                      </button>
                    ))}
                  </div>

                  <div className="wheelColumn" role="listbox" aria-label="AM/PM">
                    {["AM", "PM"].map((p) => (
                      <button
                        type="button"
                        key={p}
                        className={`wheelItem ${p === activePeriod ? "isActive" : ""
                          }`}
                        onClick={() => setAmPm(p)}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Month Picker */}
            {viewMode === "month" && (
              <div className="pickerGrid">
                {months.map((m, i) => (
                  <button
                    type="button"
                    key={m}
                    className={`pickerCell ${i === viewMonth.getMonth() ? "isSelected" : ""
                      }`}
                    onClick={() => {
                      const nm = new Date(viewMonth);
                      nm.setMonth(i);
                      setViewMonth(nm);
                      setViewMode("date");
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}

            {/* Year Picker */}
            {viewMode === "year" && (
              <div className="pickerGrid">
                {years.map((y) => (
                  <button
                    type="button"
                    key={y}
                    className={`pickerCell ${y === viewMonth.getFullYear() ? "isSelected" : ""
                      }`}
                    onClick={() => {
                      const ny = new Date(viewMonth);
                      ny.setFullYear(y);
                      setViewMonth(ny);
                      setViewMode("date");
                    }}
                  >
                    {y}
                  </button>
                ))}
              </div>
            )}

            {/* Footer */}
            <footer className="dtpActions">
              <button type="button" className="ghostBtn" onClick={setToday}>
                Today
              </button>
              <button type="button" className="ghostBtn" onClick={clear}>
                Clear
              </button>
              <button type="button" className="primaryBtn" onClick={apply}>
                Apply
              </button>
            </footer>
          </div>
        </>
      )}
    </div>
  );
}
