import React, { useState, useMemo, useEffect } from "react";
import { formatNumber } from "@/utils/formatNumbers";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calendar as CalendarIcon,
} from "lucide-react";

const months = [
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

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const shortMonths = [
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

const TradeCalendar = ({
  trades,
  onDateSelect,
  selectedMonth,
  selectedYear,
  years,
  setSelectedMonth,
  setSelectedYear,
}) => {
  const [view, setView] = useState("month"); // 'month' or 'year'
  const [selectedDate, setSelectedDate] = useState(null);

  const [showAllMonths, setShowAllMonths] = useState(false);

  // Filter trades for selected month (monthly view)
  const monthlyTrades = useMemo(() => {
    if (!selectedMonth || !selectedYear) return [];
    return trades.filter((trade) => {
      const d = new Date(trade.closeTime);
      return (
        d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear
      );
    });
  }, [trades, selectedMonth, selectedYear]);

  // Filter trades for selected year (yearly view)
  const yearlyTrades = useMemo(() => {
    if (!selectedYear) return [];
    return trades.filter(
      (trade) => new Date(trade.closeTime).getFullYear() === selectedYear
    );
  }, [trades, selectedYear]);

  // Group trades by date (YYYY-MM-DD)
  const tradesByDate = useMemo(() => {
    const grouped = {};
    trades.forEach((t) => {
      const d = new Date(t.closeTime);
      if (!selectedYear || d.getFullYear() === selectedYear) {
        const dateStr = d.toLocaleDateString("en-CA"); // YYYY-MM-DD
        if (!grouped[dateStr]) grouped[dateStr] = [];
        grouped[dateStr].push(t);
      }
    });
    return grouped;
  }, [trades, selectedYear]);

  // Calendar days for monthly view
  const calendarDays = useMemo(() => {
    if (!selectedMonth || !selectedYear) return [];
    const firstDay = new Date(selectedYear, selectedMonth - 1, 1);
    const lastDay = new Date(selectedYear, selectedMonth, 0);

    const startDay = (firstDay.getDay() + 6) % 7; // shift Sun→last (Mon=0)
    const totalDays = lastDay.getDate();

    const days = [];
    for (let i = 0; i < startDay; i++) days.push(null); // empty slots
    for (let d = 1; d <= totalDays; d++) days.push(d);

    return days;
  }, [selectedMonth, selectedYear]);

  // Build month calendar (for yearly view)
  const buildCalendar = (monthIndex) => {
    const firstDay = new Date(selectedYear, monthIndex, 1);
    const lastDay = new Date(selectedYear, monthIndex + 1, 0);

    const startDay = (firstDay.getDay() + 6) % 7;
    const totalDays = lastDay.getDate();

    const days = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let d = 1; d <= totalDays; d++) days.push(d);

    return days;
  };

  // Monthly stats
  const monthlyStats = useMemo(() => {
    let totalTrades = monthlyTrades.length;
    let winTrades = monthlyTrades.filter((t) => t.pnl > 0).length;
    let loseTrades = monthlyTrades.filter((t) => t.pnl < 0).length;
    let totalPnl = monthlyTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    let winRate = totalTrades > 0 ? (winTrades / totalTrades) * 100 : 0;

    return { totalTrades, winTrades, loseTrades, totalPnl, winRate };
  }, [monthlyTrades]);

  // Yearly stats
  const yearlyStats = useMemo(() => {
    let totalTrades = yearlyTrades.length;
    let winTrades = yearlyTrades.filter((t) => t.pnl > 0).length;
    let loseTrades = yearlyTrades.filter((t) => t.pnl < 0).length;
    let totalPnl = yearlyTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    let winRate = totalTrades > 0 ? (winTrades / totalTrades) * 100 : 0;

    return { totalTrades, winTrades, loseTrades, totalPnl, winRate };
  }, [yearlyTrades]);

  // Effect: clear selectedDate if trades or month/year changes
  useEffect(() => {
    setSelectedDate(null);
  }, [trades, selectedMonth, selectedYear]);

  // Get current stats based on view
  const currentStats = view === "month" ? monthlyStats : yearlyStats;

  // Navigation handlers
  const navigateMonth = (direction) => {
    if (direction === "prev") {
      if (selectedMonth === 1) {
        setSelectedMonth(12);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      if (selectedMonth === 12) {
        setSelectedMonth(1);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  };
  const currentYear = new Date().getFullYear();

  const navigateYear = (direction) => {
    setSelectedYear((prev) => {
      if (direction === "prev") return prev - 1;
      if (direction === "next" && prev < currentYear) return prev + 1;
      return prev;
    });
  };

  const handleDateClick = (dateStr, dayTrades) => {
    if (dayTrades && dayTrades.length > 0) {
      setSelectedDate(dateStr);
      onDateSelect(dateStr, dayTrades);
    }
  };
  return (
    <div className=" flexClm gap_24">
      {/* View Toggle */}
      {/* <div className="view-toggle flexRow gap_8">
        <button
          className={`toggle-btn width100 flexRow gap_8 flex_center ${
            view === "month" ? "active" : ""
          }`}
          onClick={() => setView("month")}
        >
          <CalendarIcon size={18} />
          Monthly Overview
        </button>

        <button
          className={`toggle-btn width100 flexRow gap_8 flex_center ${
            view === "year" ? "active" : ""
          }`}
          onClick={() => setView("year")}
        >
          <BarChart3 size={18} />
          Yearly Overview
        </button>
      </div> */}

      {/* Header with Navigation */}
      {view === "month" && (
        <div className="calendarHeader flexRow flexRow_stretch">
          <div className="flexClm">
            <span className="font_weight_600">
              {selectedMonth
                ? `${new Date(0, selectedMonth - 1).toLocaleString("default", {
                    month: "long",
                  })}`
                : "All Months"}
            </span>
            <span className="font_12">Overview</span>
          </div>

          <div className="flexRow gap_8">
            <button className="navButton" onClick={() => navigateMonth("prev")}>
              <ChevronLeft size={16} />
            </button>
            <button className="navButton" onClick={() => navigateMonth("next")}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* {view === "year" && (
        <div className="calendarHeader flexRow flexRow_stretch">
          <div className="flexClm">
            <span className="font_weight_600">{selectedYear}</span>
            <span className="font_12">Overview</span>
          </div>

          <div className="flexRow gap_8">
            <button className="navButton" onClick={() => navigateYear("prev")}>
              <ChevronLeft size={16} />
            </button>
            <button
              className="navButton"
              onClick={() => navigateYear("next")}
              disabled={selectedYear === currentYear}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )} */}

      <div className="calendarReverse gridContainer gap_24">
        {/* Stats Cards */}
        <div className="gridContainer">
          <div className="chart_boxBg pad_16 flexRow gap_12">
            <div className="statIcon total">
              <BarChart3 size={20} />
            </div>
            <div className="statContent">
              <span className="statValue">{currentStats.totalTrades}</span>
              <span className="statLabel">
                {view === "month" ? "Month Trades" : "Year Trades"}
              </span>
            </div>
          </div>

          <div className="chart_boxBg pad_16 flexRow gap_12">
            <div className="statIcon win">
              <TrendingUp size={20} />
            </div>
            <div className="statContent">
              <span className="statValue">{currentStats.winTrades}</span>
              <span className="statLabel">Winning Trades</span>
            </div>
          </div>

          <div className="chart_boxBg pad_16 flexRow gap_12">
            <div className="statIcon loss">
              <TrendingDown size={20} />
            </div>
            <div className="statContent">
              <span className="statValue">{currentStats.loseTrades}</span>
              <span className="statLabel">Losing Trades</span>
            </div>
          </div>

          <div className="chart_boxBg pad_16 flexRow gap_12">
            <div className="statIcon pnl">
              <span
                className={`pnlSymbol ${
                  currentStats.totalPnl >= 0 ? "success" : "error"
                }`}
              >
                {currentStats.totalPnl >= 0 ? "+" : "-"}
              </span>
            </div>
            <div className="statContent">
              <span
                className={`statValue ${
                  currentStats.totalPnl >= 0 ? "success" : "error"
                }`}
              >
                {formatNumber(currentStats.totalPnl)}
              </span>
              <span className="statLabel">
                {view === "month" ? "Month PnL" : "Year PnL"}
              </span>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {view === "month" ? (
            <motion.div
              key="month-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="monthView boxBg"
            >
              {/* Weekday Headers */}
              <div className="weekdayHeaders">
                {weekdays.map((day) => (
                  <div key={day} className="weekdayHeader">
                    {day.substring(0, 1)}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="calendarGrid">
                {calendarDays.map((day, i) => {
                  if (!day) return <div key={i} className="emptyDay"></div>;

                  const dateStr = `${selectedYear}-${String(
                    selectedMonth
                  ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const dayTrades = tradesByDate[dateStr] || [];
                  const pnl = dayTrades.reduce(
                    (sum, t) => sum + (t.pnl || 0),
                    0
                  );
                  const hasTrades = dayTrades.length > 0;

                  // ✅ check if it's today
                  const todayStr = new Date().toISOString().split("T")[0];
                  const isToday = dateStr === todayStr;

                  return (
                    <motion.div
                      key={i}
                      className={`calendarDay ${hasTrades ? "hasTrades" : ""} 
          ${selectedDate === dateStr ? "selected" : ""} 
          ${
            pnl > 0
              ? "success"
              : pnl < 0
                ? "error"
                : hasTrades
                  ? "shade-50"
                  : ""
          } 
          ${isToday ? "today" : ""}`}
                      onClick={() => handleDateClick(dateStr, dayTrades)}
                      whileHover={{ scale: hasTrades ? 1.05 : 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <span className="dayNumber">{day}</span>
                      {hasTrades && (
                        <div className="dayInfo">
                          <div
                            className={`pnlIndicator ${
                              pnl > 0
                                ? "profit"
                                : pnl < 0
                                  ? "loss"
                                  : "breakeven"
                            }`}
                          >
                            {pnl > 0 ? "+" : ""}
                            {formatNumber(pnl)}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <div className="flexClm gap_12">
              <motion.div
                key="year-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="yearView"
              >
                <div className="yearGrid">
                  {(showAllMonths
                    ? months
                    : months.slice(
                        Math.max(0, selectedMonth - 3), // previous 2 months
                        selectedMonth // current month index is inclusive
                      )
                  ).map((month, idxOffset) => {
                    // Adjust index if slicing
                    const idx = showAllMonths
                      ? idxOffset
                      : selectedMonth - 3 + idxOffset;

                    const days = buildCalendar(idx);
                    const monthTrades = trades.filter((t) => {
                      const d = new Date(t.closeTime);
                      return (
                        d.getMonth() === idx && d.getFullYear() === selectedYear
                      );
                    });

                    const monthMaxProfit = Math.max(
                      ...monthTrades.map((t) => t.pnl).filter((p) => p > 0),
                      0
                    );
                    const monthMaxLoss = Math.min(
                      ...monthTrades.map((t) => t.pnl).filter((p) => p < 0),
                      0
                    );

                    const monthPnl = monthTrades.reduce(
                      (sum, t) => sum + (t.pnl || 0),
                      0
                    );

                    return (
                      <motion.div
                        key={idx}
                        className={`monthCell ${
                          idx === new Date().getMonth() &&
                          selectedYear === new Date().getFullYear()
                            ? "currentMonth"
                            : ""
                        }`}
                        whileHover={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="monthHeader">
                          <span className="monthName">{shortMonths[idx]}</span>
                          {monthTrades.length > 0 && (
                            <span
                              className={`monthPnl ${
                                monthPnl > 0
                                  ? "success"
                                  : monthPnl < 0
                                    ? "error"
                                    : "shade_50"
                              }`}
                            >
                              {monthPnl > 0 ? "+" : ""}
                              {formatNumber(monthPnl)}
                            </span>
                          )}
                        </div>

                        <div className="monthWeekdays">
                          {["M", "T", "W", "T", "F", "S", "S"].map((day) => (
                            <span key={day} className="weekdayInitial">
                              {day}
                            </span>
                          ))}
                        </div>

                        <div className="monthDays">
                          {days.map((d, i) => {
                            if (!d)
                              return <div key={i} className="emptyDay"></div>;

                            const dateStr = `${selectedYear}-${String(
                              idx + 1
                            ).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                            const dayTrades = tradesByDate[dateStr] || [];
                            const hasTrades = dayTrades.length > 0;
                            const dayPnl = dayTrades.reduce(
                              (sum, t) => sum + (t.pnl || 0),
                              0
                            );

                            let intensity = 0;
                            let bgStyle = {};

                            if (dayPnl > 0 && monthMaxProfit > 0) {
                              intensity = Math.min(1, dayPnl / monthMaxProfit);
                              bgStyle = {
                                background: `rgba(34, 197, 94, ${
                                  0.3 + intensity * 0.7
                                })`, // green
                                color: "#fff",
                              };
                            } else if (dayPnl < 0 && monthMaxLoss < 0) {
                              intensity = Math.min(
                                1,
                                Math.abs(dayPnl) / Math.abs(monthMaxLoss)
                              );
                              bgStyle = {
                                background: `rgba(239, 68, 68, ${
                                  0.3 + intensity * 0.7
                                })`, // red
                                color: "#fff",
                              };
                            }

                            return (
                              <div
                                key={i}
                                className={`yearDay ${
                                  hasTrades ? "hasTrades" : ""
                                }`}
                                onClick={() =>
                                  handleDateClick(dateStr, dayTrades)
                                }
                                title={
                                  hasTrades
                                    ? `${dayTrades.length} trade${
                                        dayTrades.length !== 1 ? "s" : ""
                                      }\nPnL: ${formatNumber(dayPnl)}`
                                    : ""
                                }
                                style={bgStyle} // ✅ monthly scaling
                              />
                            );
                          })}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
              <div>
                {/* See More / See Less Button */}
                {!showAllMonths && (
                  <button
                    className="button_ter width100"
                    onClick={() => setShowAllMonths(true)}
                  >
                    Show all months
                  </button>
                )}
                {showAllMonths && (
                  <button
                    className="button_ter width100"
                    onClick={() => setShowAllMonths(false)}
                  >
                    Show less
                  </button>
                )}
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TradeCalendar;
