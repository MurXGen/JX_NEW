import { X, ChevronUp, ChevronDown } from "lucide-react";
import React, { useEffect, useRef, useState, useMemo } from "react";

export default function DateTimePicker({
  label = "Date & Time",
  value,
  onChange,
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() =>
    value ? new Date(value) : new Date(),
  );
  const modalRef = useRef(null);

  const currentYear = new Date().getFullYear();
  const years = useMemo(
    () => Array.from({ length: 11 }, (_, i) => currentYear - i),
    [currentYear],
  );

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const daysInMonth = new Date(
    draft.getFullYear(),
    draft.getMonth() + 1,
    0,
  ).getDate();
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
    return `${d.getDate()} ${
      months[d.getMonth()]
    } ${d.getFullYear()} ${h12}:${mm} ${ampm}`;
  }, [value]);

  // ✅ Date Setters
  const setDay = (d) => setDraft((prev) => new Date(prev.setDate(d)));
  const setMonth = (m) => {
    const next = new Date(draft);
    next.setMonth(m);
    const maxDay = new Date(next.getFullYear(), m + 1, 0).getDate();
    if (next.getDate() > maxDay) next.setDate(maxDay);
    setDraft(next);
  };
  const setYear = (y) => setDraft((prev) => new Date(prev.setFullYear(y)));

  // ✅ Time Setters
  const setHour = (h12) => {
    const base = draft.getHours() >= 12 ? 12 : 0;
    const h24 = (h12 % 12) + base;
    setDraft((prev) => new Date(prev.setHours(h24)));
  };
  const setMinute = (m) => setDraft((prev) => new Date(prev.setMinutes(m)));
  const setAmPm = (period) => {
    const h = draft.getHours();
    if (period === "AM" && h >= 12)
      setDraft((prev) => new Date(prev.setHours(h - 12)));
    if (period === "PM" && h < 12)
      setDraft((prev) => new Date(prev.setHours(h + 12)));
  };

  // ✅ Actions
  const apply = () => {
    onChange?.(new Date(draft).toISOString());
    setOpen(false);
  };
  const clear = () => {
    onChange?.(null);
    setDraft(new Date());
    setOpen(false);
  };
  const setToday = () => {
    const today = new Date();
    setDraft(today);
    scrollToActive();
  };

  // ✅ Close on click outside or Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    const onClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [open]);

  const scrollToActive = () => {
    document.querySelectorAll(".wheelList").forEach((list) => {
      const activeEl = list.querySelector(".isActive");
      if (activeEl)
        activeEl.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  };

  useEffect(() => {
    if (open) setTimeout(scrollToActive, 50);
  }, [open, draft]);

  // ✅ Render Wheel
  const renderWheel = (items, active, setFn, label) => (
    <div className="wheelColumn">
      <button
        type="button"
        className="arrowBtn"
        onClick={() => {
          const idx = items.indexOf(active);
          if (idx > 0) setFn(items[idx - 1]);
        }}
      >
        <ChevronUp size={20} />
      </button>

      <div className="wheelList">
        {items.map((item) => (
          <button
            type="button"
            key={item}
            className={`wheelItem ${item === active ? "isActive" : ""}`}
            onClick={() => setFn(item)}
          >
            {isNaN(item) ? item : item.toString().padStart(2, "0")}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="arrowBtn"
        onClick={() => {
          const idx = items.indexOf(active);
          if (idx < items.length - 1) setFn(items[idx + 1]);
        }}
      >
        <ChevronDown size={20} />
      </button>

      {/* ✅ Add Label */}
      <div className="wheelLabel">{label}</div>
    </div>
  );

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
            <header className="dtpHeader">
              <button
                type="button"
                className="button_ter"
                onClick={() => setOpen(false)}
              >
                <X size={20} />
              </button>
            </header>

            {/* Date Section */}
            <div className="dtpSection">
              <div className="dtpWheels">
                <div className="flexClm flex_center gap_12 font_12">
                  <div className="wheelLabel">Day</div>
                  {renderWheel(days, activeDay, setDay)}
                </div>
                <div className="flexClm flex_center gap_12 font_12">
                  <div className="wheelLabel">Month</div>
                  {renderWheel(
                    months.map((m) => m),
                    months[activeMonth],
                    (m) => setMonth(months.indexOf(m)),
                  )}
                </div>
                <div className="flexClm flex_center gap_12 font_12">
                  <div className="wheelLabel">Year</div>
                  {renderWheel(years, activeYear, setYear)}
                </div>
              </div>
            </div>

            {/* Time Section */}
            <div className="dtpSection">
              <div className="dtpWheels">
                <div className="flexClm flex_center gap_12 font_12">
                  <div className="wheelLabel">Hour</div>
                  {renderWheel(hours, activeH12, setHour)}
                </div>
                <div className="flexClm flex_center gap_12 font_12">
                  <div className="wheelLabel">Minute</div>
                  {renderWheel(minutes, activeMin, setMinute)}
                </div>
                <div className="flexClm flex_center gap_12 font_12">
                  {renderWheel(["AM", "PM"], activePeriod, setAmPm)}
                </div>
              </div>
            </div>

            {/* Footer */}
            <footer className="flexRow flexRow_stretch gap_12">
              <button type="button" className="button_ter" onClick={setToday}>
                Today
              </button>
              <button type="button" className="button_ter" onClick={clear}>
                Clear
              </button>
              <button type="button" className="button_pri" onClick={apply}>
                Apply
              </button>
            </footer>
          </div>
        </>
      )}
    </div>
  );
}
