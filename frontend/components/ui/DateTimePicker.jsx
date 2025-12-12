// SimpleDateTimePicker.jsx
import { useState, useEffect, useRef } from "react";

export default function SimpleDateTimePicker({
  value,
  onChange,
  label = "Date & Time",
}) {
  // --- DATE FIELDS ---
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  // --- TIME FIELDS ---
  const [hoursInput, setHoursInput] = useState("12");
  const [minutesInput, setMinutesInput] = useState("00");
  const [secondsInput, setSecondsInput] = useState("00");
  const [isAM, setIsAM] = useState(true);

  // Refs for auto-jump
  const monthRef = useRef(null);
  const yearRef = useRef(null);
  const minRef = useRef(null);
  const secRef = useRef(null);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const dayBeforeYesterday = new Date(today);
  dayBeforeYesterday.setDate(today.getDate() - 2);

  // Format date helper
  const formatDateParts = (date) => ({
    d: String(date.getDate()).padStart(2, "0"),
    m: String(date.getMonth() + 1).padStart(2, "0"),
    y: String(date.getFullYear()),
  });

  // Initialize from value
  useEffect(() => {
    const date = value ? new Date(value) : today;
    const { d, m, y } = formatDateParts(date);

    setDay(d);
    setMonth(m);
    setYear(y);

    let h = date.getHours();
    const min = String(date.getMinutes()).padStart(2, "0");
    const sec = String(date.getSeconds()).padStart(2, "0");

    setIsAM(h < 12);

    h = h % 12 || 12;
    setHoursInput(String(h).padStart(2, "0"));
    setMinutesInput(min);
    setSecondsInput(sec);
  }, [value]);

  // Handle date fields
  const handleDatePart = (e, setter, max, nextRef) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > max) return;

    setter(val);

    if (val.length === max && nextRef?.current) {
      nextRef.current.focus();
    }
  };

  // Handle time fields
  const handleTimePart = (e, setter, max, nextRef) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > max) return;

    setter(val);

    if (val.length === max && nextRef?.current) {
      nextRef.current.focus();
    }
  };

  // Update final ISO value
  const validateAndUpdate = () => {
    if (!day || !month || !year) return;

    let h = Number(hoursInput || 0);
    let m = Number(minutesInput || 0);
    let s = Number(secondsInput || 0);

    // Convert 12h → 24h
    if (!isAM) {
      if (h !== 12) h += 12;
    } else if (h === 12) {
      h = 0;
    }

    const selected = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      h,
      m,
      s
    );

    onChange(selected.toISOString());
  };

  const quickDates = [
    { label: "Today", date: today },
    { label: "Yesterday", date: yesterday },
    { label: "Day before", date: dayBeforeYesterday },
  ];

  return (
    <div className="boxBg">
      <label>{label}</label>

      <div className="gridContainer">
        {/* DATE SECTION */}
        <div className="flexClm gap_12">
          <div className="font_12">Date</div>

          <div className="flexRow gap_12">
            <input
              type="text"
              value={day}
              placeholder="DD"
              maxLength={2}
              onChange={(e) => handleDatePart(e, setDay, 2, monthRef)}
              onBlur={validateAndUpdate}
              className="font_14 center-input"
            />
            <span>/</span>

            <input
              ref={monthRef}
              type="text"
              value={month}
              placeholder="MM"
              maxLength={2}
              onChange={(e) => handleDatePart(e, setMonth, 2, yearRef)}
              onBlur={validateAndUpdate}
              className="font_14 center-input"
            />
            <span>/</span>

            <input
              ref={yearRef}
              type="text"
              value={year}
              placeholder="YYYY"
              maxLength={4}
              onChange={(e) => handleDatePart(e, setYear, 4)}
              onBlur={validateAndUpdate}
              className="font_14 center-input"
            />
          </div>

          <div className="flexRow gap_12 flexRow_stretch">
            {quickDates.map((q) => {
              const { d, m, y } = formatDateParts(q.date);
              const isActive = d === day && m === month && y === year;

              return (
                <button
                  key={q.label}
                  type="button"
                  className={`button_sec width100 ${isActive ? "active" : ""}`}
                  onClick={() => {
                    setDay(d);
                    setMonth(m);
                    setYear(y);
                    validateAndUpdate();
                  }}
                >
                  {q.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* TIME SECTION */}
        <div className="flexClm gap_12">
          <div className="font_12">Time</div>

          <div className="flexRow gap_12">
            <input
              type="text"
              value={hoursInput}
              placeholder="HH"
              maxLength={2}
              onChange={(e) => handleTimePart(e, setHoursInput, 2, minRef)}
              onBlur={validateAndUpdate}
              className="font_14 center-input"
            />
            <span>:</span>

            <input
              ref={minRef}
              type="text"
              value={minutesInput}
              placeholder="MM"
              maxLength={2}
              onChange={(e) => handleTimePart(e, setMinutesInput, 2, secRef)}
              onBlur={validateAndUpdate}
              className="font_14 center-input"
            />
            <span>:</span>

            <input
              ref={secRef}
              type="text"
              value={secondsInput}
              placeholder="SS"
              maxLength={2}
              onChange={(e) => handleTimePart(e, setSecondsInput, 2)}
              onBlur={validateAndUpdate}
              className="font_14 center-input"
            />
          </div>

          <div className="flexRow gap_12 flexRow_stretch">
            <button
              type="button"
              className={`button_sec width100 ${isAM ? "selected" : ""}`}
              onClick={() => {
                setIsAM(true);
                validateAndUpdate();
              }}
            >
              AM
            </button>

            <button
              type="button"
              className={`button_sec width100 ${!isAM ? "selected" : ""}`}
              onClick={() => {
                setIsAM(false);
                validateAndUpdate();
              }}
            >
              PM
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
