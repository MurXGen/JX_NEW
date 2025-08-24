import React, { useState, useMemo } from "react";
import { formatNumber } from "@/utils/formatNumbers";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const TradeCalendar = ({ trades, onDateSelect }) => {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  // Years 2015 → current year
  const years = Array.from({ length: today.getFullYear() - 2014 }, (_, i) => 2015 + i);

  // Filter trades for selected month/year
  const monthlyTrades = useMemo(() => {
    return trades.filter((trade) => {
      const d = new Date(trade.openTime);
      return (
        d.getMonth() + 1 === parseInt(selectedMonth) &&
        d.getFullYear() === parseInt(selectedYear)
      );
    });
  }, [trades, selectedMonth, selectedYear]);

  // Group trades by date
  const tradesByDate = useMemo(() => {
    const grouped = {};
    trades.forEach((t) => {
      const d = new Date(t.openTime);
      if (d.getFullYear() === selectedYear) {
        const dateStr = d.toISOString().split("T")[0]; // YYYY-MM-DD
        if (!grouped[dateStr]) grouped[dateStr] = [];
        grouped[dateStr].push(t);
      }
    });
    return grouped;
  }, [trades, selectedYear]);

  // Build calendar days
  const calendarDays = useMemo(() => {
    const firstDay = new Date(selectedYear, selectedMonth - 1, 1);
    const lastDay = new Date(selectedYear, selectedMonth, 0);

    const startDay = (firstDay.getDay() + 6) % 7; // shift Sun→last (Mon=0)
    const totalDays = lastDay.getDate();

    const days = [];
    for (let i = 0; i < startDay; i++) days.push(null); // empty start slots
    for (let d = 1; d <= totalDays; d++) days.push(d);

    return days;
  }, [selectedMonth, selectedYear]);

  // Generate month calendars
  const buildCalendar = (monthIndex) => {
    const firstDay = new Date(selectedYear, monthIndex, 1);
    const lastDay = new Date(selectedYear, monthIndex + 1, 0);

    const startDay = (firstDay.getDay() + 6) % 7; // Mon=0, Sun=6
    const totalDays = lastDay.getDate();

    const days = [];
    for (let i = 0; i < startDay; i++) days.push(null); // empty slots
    for (let d = 1; d <= totalDays; d++) days.push(d);

    return days;
  };

  // Stats
  const stats = useMemo(() => {
    let totalTrades = monthlyTrades.length;
    let winTrades = monthlyTrades.filter((t) => t.pnl > 0).length;
    let loseTrades = monthlyTrades.filter((t) => t.pnl < 0).length;
    let totalPnl = monthlyTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

    return { totalTrades, winTrades, loseTrades, totalPnl };
  }, [monthlyTrades]);

  return (
    <>
      <div>
        {/* Month + Year selector */}
        <div style={{ marginBottom: "20px" }}>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {months.map((m, i) => (
              <option key={i + 1} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Calendar */}
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", fontWeight: "bold" }}>
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} style={{ textAlign: "center", padding: "5px" }}>{d}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderTop: "1px solid #ccc" }}>
            {calendarDays.map((day, i) => {
              if (!day) return <div key={i}></div>;

              const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayTrades = tradesByDate[dateStr] || [];
              const pnl = dayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

              return (
                <div
                  key={i}
                  onClick={() => dayTrades.length > 0 && onDateSelect(dateStr)}
                  style={{
                    border: "1px solid #ddd",
                    padding: "6px",
                    textAlign: "center",
                    cursor: dayTrades.length > 0 ? "pointer" : "default",
                    background: dayTrades.length > 0 ? "#f9f9f9" : "transparent"
                  }}
                >
                  <div>{day}</div>
                  {dayTrades.length > 0 && (
                    <div style={{ color: pnl > 0 ? "green" : pnl < 0 ? "red" : "gray", fontSize: "12px" }}>
                      {formatNumber(pnl)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        <div style={{ marginTop: "20px" }}>
          <p>Total Trades: {stats.totalTrades}</p>
          <p>Winning Trades: {stats.winTrades}</p>
          <p>Losing Trades: {stats.loseTrades}</p>
          <p>Total PnL: {formatNumber(stats.totalPnl)}</p>
        </div>
      </div>
      <div className="year-selector">
        <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Yearly Calendar Grid */}
      <div className="year-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
        {months.map((month, idx) => {
          const days = buildCalendar(idx);

          return (
            <div key={idx} className="month-calendar" style={{ border: "1px solid #ddd", padding: "10px", borderRadius: "8px" }}>
              <h4 style={{ textAlign: "center" }}>{month}</h4>

              {/* Weekdays */}
              <div className="weekdays" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center", fontWeight: "bold" }}>
                {weekdays.map((w) => (
                  <div key={w}>{w}</div>
                ))}
              </div>

              {/* Days */}
              <div className="days" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center" }}>
                {days.map((d, i) => {
                  if (!d) return <div key={i} />;

                  const dateStr = `${selectedYear}-${String(idx + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                  const dayTrades = tradesByDate[dateStr] || [];

                  let bg = "";
                  if (dayTrades.length > 0) {
                    const totalPnl = dayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
                    bg = totalPnl > 0 ? "lightgreen" : totalPnl < 0 ? "salmon" : "lightgray";
                  }

                  return (
                    <div
                      key={i}
                      style={{
                        padding: "4px",
                        margin: "2px",
                        backgroundColor: bg,
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                      onClick={() => onDateSelect?.(dateStr, dayTrades)}
                    >
                      {d}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>

  );
};

export default TradeCalendar;
