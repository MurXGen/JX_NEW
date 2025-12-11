// SimpleDateTimePicker.jsx
import { useState, useEffect } from "react";

export default function SimpleDateTimePicker({
  value,
  onChange,
  label = "Date & Time",
}) {
  const [dateInput, setDateInput] = useState("");
  const [timeInput, setTimeInput] = useState("00:00:00");
  const [isAM, setIsAM] = useState(true);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const dayBeforeYesterday = new Date(today);
  dayBeforeYesterday.setDate(today.getDate() - 2);

  // Format date to DD/MM/YYYY
  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Initialize with current value or defaults
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      setDateInput(formatDate(date));

      let hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");

      // ❌ REMOVE THIS — causes AM/PM toggles to require double click
      // setIsAM(hours < 12);

      hours = hours % 12 || 12;
      setTimeInput(`${String(hours).padStart(2, "0")}:${minutes}:${seconds}`);
    } else {
      setDateInput(formatDate(today));
      setTimeInput("12:00:00");
    }
  }, [value]);

  const handleDateChange = (e) => {
    let value = e.target.value.replace(/[^0-9/]/g, "");

    // Auto-insert slashes
    if (value.length === 2 && !value.includes("/")) {
      value = value + "/";
    } else if (value.length === 5 && value.split("/").length === 2) {
      value = value + "/";
    }

    // Limit to DD/MM/YYYY format
    if (value.length <= 10) {
      setDateInput(value);
    }
  };

  const handleTimeChange = (e) => {
    let value = e.target.value.replace(/[^0-9:]/g, "");

    // Auto-insert colons
    if (value.length === 2 && !value.includes(":")) {
      value = value + ":";
    } else if (value.length === 5 && value.split(":").length === 2) {
      value = value + ":";
    }

    // Limit to HH:MM:SS format
    if (value.length <= 8) {
      setTimeInput(value);
    }
  };

  const handleQuickDate = (date) => {
    setDateInput(formatDate(date));
  };

  const validateAndUpdate = () => {
    // Parse date
    const dateParts = dateInput.split("/");
    if (dateParts.length !== 3) return;

    const [day, month, year] = dateParts.map(Number);

    // Parse time
    const timeParts = timeInput.split(":");
    if (timeParts.length < 2) return;

    let [hours, minutes, seconds = 0] = timeParts.map(Number);

    // Convert 12-hour to 24-hour
    if (!isAM) {
      if (hours !== 12) hours += 12;
    } else if (hours === 12) {
      hours = 0;
    }

    // Create date object
    const selectedDate = new Date(
      year,
      month - 1,
      day,
      hours,
      minutes,
      seconds
    );

    onChange(selectedDate.toISOString());
  };

  const quickDates = [
    { label: "Today", date: today },
    { label: "Yesterday", date: yesterday },
    { label: "Day before", date: dayBeforeYesterday },
  ];

  return (
    <div className="boxBg">
      <label className="">{label}</label>

      <div className="gridContainer">
        {/* Date Section */}
        <div className="flexClm gap_12">
          <div className="font_12">Date</div>

          <div className="flexClm gap_12">
            <input
              type="text"
              value={dateInput}
              onChange={handleDateChange}
              placeholder="DD/MM/YYYY"
              onBlur={validateAndUpdate}
              className="font_14"
            />

            <div className="flexRow flexRow_stretch gap_12">
              {quickDates.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className={`button_sec width100 ${formatDate(item.date) === dateInput ? "active" : ""}`}
                  onClick={() => handleQuickDate(item.date)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Time Section */}
        <div className="flexClm gap_12">
          <div className="font_12">Time</div>

          <div className="flexClm gap_12">
            <input
              type="text"
              value={timeInput}
              onChange={handleTimeChange}
              placeholder="HH:MM:SS"
              className="font_14"
              onBlur={validateAndUpdate}
            />
            <div className="flexRow flexRow_stretch gap_12">
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
    </div>
  );
}
