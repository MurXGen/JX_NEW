"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from "lucide-react";
import { formatCurrency } from "@/utils/formatNumbers";

const SliderCalendar = ({ trades, onDateSelect, currencySymbol }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [days, setDays] = useState([]);
  const [monthPnL, setMonthPnL] = useState(0);
  const sliderRef = useRef(null);

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Get all days in current month
  useEffect(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const daysInMonth = [];
    let monthTotalPnL = 0;

    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const dayTrades = trades.filter((t) => {
        const tradeDate = new Date(t.closeTime || t.openTime)
          .toISOString()
          .split("T")[0];
        return tradeDate === dateStr;
      });

      const dayPnL = dayTrades.reduce(
        (sum, t) => sum + (Number(t.pnl) || 0),
        0,
      );
      monthTotalPnL += dayPnL;

      daysInMonth.push({
        date: new Date(d),
        day: d.getDate(),
        dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
        pnl: dayPnL,
        trades: dayTrades.length,
        isToday: d.toDateString() === new Date().toDateString(),
        isSelected: d.toDateString() === selectedDate.toDateString(),
      });
    }

    setDays(daysInMonth);
    setMonthPnL(monthTotalPnL);

    // Scroll to selected date or today
    setTimeout(() => {
      if (sliderRef.current) {
        const selectedDay = daysInMonth.find((d) => d.isSelected || d.isToday);
        if (selectedDay) {
          const index = daysInMonth.findIndex(
            (d) => d.date === selectedDay.date,
          );
          const scrollPosition =
            index * 70 - sliderRef.current.offsetWidth / 2 + 35;
          sliderRef.current.scrollTo({
            left: scrollPosition,
            behavior: "smooth",
          });
        }
      }
    }, 100);
  }, [currentDate, selectedDate, trades]);

  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
    );
  };

  const handlePrevYear = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1),
    );
  };

  const handleNextYear = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), 1),
    );
  };

  const handleDateSelect = (day) => {
    setSelectedDate(day.date);
    onDateSelect?.(day.date);
  };

  return (
    <div className="flexClm stats-card radius-12">
      {/* Header with Month/Year Navigation */}
      <div className="flexRow flexRow_stretch" style={{ alignItems: "center" }}>
        <div className="flexClm ">
          <div className="flexRow gap_8" style={{ alignItems: "center" }}>
            <CalendarIcon size={20} className="primary" />
            <span className="font_16 font_weight_600">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
          </div>
          {/* Month PnL Summary */}
          <div className="flexRow flexRow_stretch ">
            <span className="font_14">Month P&L:</span>
            <span
              className={`font_16 font_weight_600 ${monthPnL >= 0 ? "success" : "error"}`}
            >
              {monthPnL >= 0 ? "+" : ""}
              {formatCurrency(monthPnL, currencySymbol)}
            </span>
          </div>
        </div>

        <div className="flexRow gap_4 ">
          <button
            onClick={handlePrevYear}
            className="btn secondary-btn"
            style={{ padding: "6px 10px" }}
            title="Previous Year"
          >
            <ChevronLeft size={16} />
            <ChevronLeft size={16} style={{ marginLeft: "-8px" }} />
          </button>
          <button
            onClick={handlePrevMonth}
            className="btn secondary-btn"
            style={{ padding: "6px 10px" }}
            title="Previous Month"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={handleNextMonth}
            className="btn secondary-btn"
            style={{ padding: "6px 10px" }}
            title="Next Month"
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={handleNextYear}
            className="btn secondary-btn"
            style={{ padding: "6px 10px" }}
            title="Next Year"
          >
            <ChevronRight size={16} />
            <ChevronRight size={16} style={{ marginLeft: "-8px" }} />
          </button>
        </div>
      </div>

      {/* Slider Calendar */}
      <div
        ref={sliderRef}
        className="flexRow flexRow_scroll gap_16"
        style={{ padding: "16px 0" }}
      >
        {days.map((day, index) => (
          <motion.button
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.01 }}
            onClick={() => handleDateSelect(day)}
            className={`flexClm flex_center ${day.isSelected ? "selected-day" : ""}`}
            style={{
              padding: "12px 16px",
              background: day.isSelected
                ? "var(--primary)"
                : day.isToday
                  ? "var(--primary-10)"
                  : "var(--card-bg)",
              border: `1px solid ${
                day.isSelected
                  ? "var(--primary)"
                  : day.trades > 0
                    ? day.pnl >= 0
                      ? "var(--success)"
                      : "var(--error)"
                    : "var(--border-color)"
              }`,
              borderRadius: "12px",
              cursor: "pointer",
              transition: "all 0.2s",
              position: "relative",
            }}
            whileTap={{ scale: 0.95 }}
          >
            {/* Day Name */}
            <span
              className="font_10"
              style={{
                color: day.isSelected ? "var(--black)" : "var(--black)",
                marginBottom: "4px",
                fontWeight: 500,
              }}
            >
              {day.dayName}
            </span>

            {/* Date Number */}
            <span
              className="font_16 font_weight_600"
              style={{
                color: day.isSelected
                  ? "white"
                  : day.isToday
                    ? "var(--primary)"
                    : "var(--black)",
                marginBottom: "4px",
              }}
            >
              {day.day}
            </span>

            {/* PnL */}
            {day.trades > 0 ? (
              <span
                className="font_10"
                style={{
                  color: day.isSelected
                    ? "white"
                    : day.pnl >= 0
                      ? "var(--success)"
                      : "var(--error)",
                  fontWeight: 600,
                }}
              >
                {day.pnl >= 0 ? "+" : ""}
                {formatCurrency(day.pnl, currencySymbol)}
              </span>
            ) : (
              <span className="font_12 black-text">-</span>
            )}

            {/* Trade Count Badge */}
            {day.trades > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "-4px",
                  right: "-4px",
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  background: day.pnl >= 0 ? "var(--success)" : "var(--error)",
                  color: "white",
                  fontSize: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                }}
              >
                {day.trades}
              </div>
            )}
          </motion.button>
        ))}
      </div>

      {/* Legend */}
      <div className="flexRow gap_16">
        <div className="flexRow gap_4" style={{ alignItems: "center" }}>
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "3px",
              background: "var(--success)",
            }}
          />
          <span className="font_12 black-text">Profit</span>
        </div>
        <div className="flexRow gap_4" style={{ alignItems: "center" }}>
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "3px",
              background: "var(--error)",
            }}
          />
          <span className="font_12 black-text">Loss</span>
        </div>
        <div className="flexRow gap_4" style={{ alignItems: "center" }}>
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "3px",
              background: "var(--primary)",
              border: "1px solid var(--primary)",
            }}
          />
          <span className="font_12 black-text">Today</span>
        </div>
      </div>
    </div>
  );
};

export default SliderCalendar;
