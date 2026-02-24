import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FiCheck, FiClock, FiTrash2 } from "react-icons/fi";

export default function DateTimePicker({ value, onChange, onClose }) {
  const [date, setDate] = useState(value ? new Date(value) : new Date());
  const [time, setTime] = useState({ hour: 12, minute: 0 });

  const currentYear = date.getFullYear();
  const currentMonth = date.getMonth();
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
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const previewDate = new Date(
    currentYear,
    currentMonth,
    date.getDate(),
    time.hour,
    time.minute,
  );

  const previewText = previewDate.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  // Update time when date changes
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      setTime({ hour: d.getHours(), minute: d.getMinutes() });
    }
  }, [value]);

  // Navigation
  const changeMonth = (dir) => {
    const newDate = new Date(date);
    newDate.setMonth(currentMonth + dir);
    setDate(newDate);
  };

  // Generate days for slider
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const today = new Date().getDate();

  // Time selection
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const handleSubmit = () => {
    const finalDate = new Date(
      currentYear,
      currentMonth,
      date.getDate(),
      time.hour,
      time.minute,
    );

    onChange?.(finalDate.toISOString());

    // 🔥 close modal after submit
    onClose?.();
  };

  const handleClear = () => {
    const now = new Date();

    // Set date to today
    setDate(now);

    // Set time to 00:00
    setTime({ hour: 0, minute: 0 });

    // Optional: reflect cleared state upstream
    onChange?.(null);
  };

  const handleNow = () => {
    const now = new Date();
    setDate(now);
    setTime({ hour: now.getHours(), minute: now.getMinutes() });
  };

  return (
    <div className="dtp">
      {/* Year & Month Navigation */}
      <div className="dtp-header">
        <button onClick={() => changeMonth(-1)} className="btn">
          <ChevronLeft size={18} />
        </button>
        <div className="font_16 text-opacity-100">
          {months[currentMonth]} {currentYear}
        </div>
        <button onClick={() => changeMonth(1)} className="btn">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Date Slider */}
      <div className="date-slider">
        {days.map((day) => (
          <button
            key={day}
            className={`date-btn ${day === date.getDate() ? "active" : ""} ${day === today ? "today" : ""}`}
            onClick={() => setDate(new Date(currentYear, currentMonth, day))}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Time Selector */}
      <div className="time-selector">
        <div className="time-col">
          <div className="time-label">Hour</div>
          <div className="time-scroll">
            {hours.map((h) => (
              <button
                key={h}
                className={`time-btn ${h === time.hour ? "active" : ""}`}
                onClick={() => setTime({ ...time, hour: h })}
              >
                {h.toString().padStart(2, "0")}
              </button>
            ))}
          </div>
        </div>
        <div className="time-col">
          <div className="time-label">Minute</div>
          <div className="time-scroll">
            {minutes.map((m) => (
              <button
                key={m}
                className={`time-btn ${m === time.minute ? "active" : ""}`}
                onClick={() => setTime({ ...time, minute: m })}
              >
                {m.toString().padStart(2, "0")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preview */}
      <div
        className="dtp-preview black-text"
        style={{
          marginTop: "12px",
          padding: "10px 12px",
          borderRadius: "8px",
          background: "var(--base-10)",
          textAlign: "center",
          fontSize: "14px",
          fontWeight: 500,
          color: "var(--base-text)",
        }}
      >
        {previewText}
      </div>

      {/* Footer */}
      <div className="flexRow gap_12 width100">
        <button
          onClick={handleClear}
          className="secondary-btn width100 primary-btn flexRow flex_center gap_8"
        >
          <FiTrash2 size={16} />
          Clear
        </button>

        <button
          onClick={handleNow}
          className="secondary-btn width100 primary-btn flexRow flex_center gap_8"
        >
          <FiClock size={16} />
          Now
        </button>

        <button
          onClick={handleSubmit}
          className="width100 primary-btn flexRow flex_center gap_8"
        >
          <FiCheck size={16} />
          Set
        </button>
      </div>
    </div>
  );
}
