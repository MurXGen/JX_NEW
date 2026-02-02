import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
    onChange?.(null);
    const now = new Date();
    setDate(now);
    setTime({ hour: now.getHours(), minute: now.getMinutes() });
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
        <button onClick={() => changeMonth(-1)} className="nav-btn">
          <ChevronLeft size={18} />
        </button>
        <div className="month-year">
          {months[currentMonth]} {currentYear}
        </div>
        <button onClick={() => changeMonth(1)} className="nav-btn">
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

      {/* Footer */}
      <div className="dtp-footer">
        <button onClick={handleClear} className="btn clear">
          Clear
        </button>
        <button onClick={handleNow} className="btn now">
          Now
        </button>
        <button onClick={handleSubmit} className="btn submit">
          Set Time
        </button>
      </div>
    </div>
  );
}
