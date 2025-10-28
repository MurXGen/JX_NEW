"use client";

import FullPageLoader from "@/components/ui/FullPageLoader";
import dayjs from "dayjs";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import JournalXCTA from "@/components/ui/JournalXCTA";
import GoogleBannerAd from "@/components/ads/GoogleBannerAd";

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

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const ViewTrades = () => {
  const [sharedData, setSharedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isClient, setIsClient] = useState(false);
  const [calendarView, setCalendarView] = useState("month"); // 'month' or 'year'
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    setIsClient(true);
    loadSharedData();
  }, [searchParams]);

  const loadSharedData = () => {
    if (!isClient) return;

    try {
      setLoading(true);
      setError("");
      const dataParam = searchParams.get("data");

      if (!dataParam) {
        setError(
          "No trade data found in the URL. Please check that you're using a valid share link."
        );
        setLoading(false);
        return;
      }

      // Decode base64 data
      try {
        // Clean the data parameter (remove any URL encoding issues)
        const cleanData = dataParam.replace(/\s/g, "+");

        // Decode base64
        const decodedData = atob(cleanData);

        const parsedData = JSON.parse(decodedData);

        // Validate data structure
        if (!parsedData.trades || !Array.isArray(parsedData.trades)) {
          throw new Error("Invalid trade data format - missing trades array");
        }

        if (parsedData.trades.length === 0) {
          throw new Error("No trades found in the shared data");
        }

        setSharedData(parsedData);
      } catch (parseError) {
        console.error("❌ Parse error:", parseError);
        throw new Error(
          "Failed to parse trade data. The link may be corrupted or expired."
        );
      }
    } catch (err) {
      console.error("❌ Error loading shared data:", err);
      setError(err.message || "Invalid or corrupted share link");
    } finally {
      setLoading(false);
    }
  };

  // Calendar calculations
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

  // Group trades by date
  const tradesByDate = useMemo(() => {
    if (!sharedData?.trades) return {};

    const grouped = {};
    sharedData.trades.forEach((t) => {
      const dateStr = dayjs(t.openTime).format("YYYY-MM-DD");
      if (!grouped[dateStr]) grouped[dateStr] = [];
      grouped[dateStr].push(t);
    });
    return grouped;
  }, [sharedData?.trades]);

  // Filter trades for selected month
  const monthlyTrades = useMemo(() => {
    if (!sharedData?.trades || !selectedMonth || !selectedYear) return [];
    return sharedData.trades.filter((trade) => {
      const tradeDate = dayjs(trade.openTime);
      return (
        tradeDate.month() + 1 === selectedMonth &&
        tradeDate.year() === selectedYear
      );
    });
  }, [sharedData?.trades, selectedMonth, selectedYear]);

  // Monthly stats
  const monthlyStats = useMemo(() => {
    const totalTrades = monthlyTrades.length;
    const winTrades = monthlyTrades.filter((t) => t.pnl > 0).length;
    const loseTrades = monthlyTrades.filter((t) => t.pnl < 0).length;
    const totalPnL = monthlyTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winRate = totalTrades > 0 ? (winTrades / totalTrades) * 100 : 0;

    return {
      totalTrades,
      winTrades,
      loseTrades,
      totalPnL,
      winRate: winRate.toFixed(1),
    };
  }, [monthlyTrades]);

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

  const navigateYear = (direction) => {
    const currentYear = new Date().getFullYear();
    setSelectedYear((prev) => {
      if (direction === "prev") return prev - 1;
      if (direction === "next" && prev < currentYear) return prev + 1;
      return prev;
    });
  };

  const handleDateClick = (day) => {
    if (!day) return;

    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(
      2,
      "0"
    )}-${String(day).padStart(2, "0")}`;
    const dayTrades = tradesByDate[dateStr];

    if (dayTrades && dayTrades.length > 0) {
      setSelectedDate(dateStr);
    }
  };

  const getDateTrades = (day) => {
    if (!day) return [];
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(
      2,
      "0"
    )}-${String(day).padStart(2, "0")}`;
    return tradesByDate[dateStr] || [];
  };

  const getDatePnL = (day) => {
    const trades = getDateTrades(day);
    return trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  };

  const getStats = (tradesData) => {
    const totalTrades = tradesData.length;
    const winningTrades = tradesData.filter((t) => t.pnl > 0).length;
    const losingTrades = tradesData.filter((t) => t.pnl < 0).length;
    const breakEvenTrades = tradesData.filter((t) => t.pnl === 0).length;
    const totalPnL = tradesData.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const avgPnL = totalTrades > 0 ? totalPnL / totalTrades : 0;

    // Best and worst trades
    const bestTrade = [...tradesData].sort((a, b) => b.pnl - a.pnl)[0];
    const worstTrade = [...tradesData].sort((a, b) => a.pnl - b.pnl)[0];

    // Long/Short stats
    const longTrades = tradesData.filter((t) => t.direction === "long");
    const shortTrades = tradesData.filter((t) => t.direction === "short");
    const longWinRate =
      longTrades.length > 0
        ? (longTrades.filter((t) => t.pnl > 0).length / longTrades.length) * 100
        : 0;
    const shortWinRate =
      shortTrades.length > 0
        ? (shortTrades.filter((t) => t.pnl > 0).length / shortTrades.length) *
          100
        : 0;

    return {
      totalTrades,
      winningTrades,
      losingTrades,
      breakEvenTrades,
      totalPnL,
      winRate: winRate.toFixed(1),
      avgPnL: avgPnL.toFixed(2),
      bestTrade,
      worstTrade,
      longTrades: longTrades.length,
      shortTrades: shortTrades.length,
      longWinRate: longWinRate.toFixed(1),
      shortWinRate: shortWinRate.toFixed(1),
    };
  };

  const getTimeRangeLabel = (timeRange) => {
    const labels = {
      today: "Today",
      last_week: "Last 7 Days",
      last_30_days: "Last 30 Days",
    };
    return labels[timeRange] || "Custom Range";
  };

  if (loading) {
    return <FullPageLoader />;
  }

  if (error || !sharedData) {
    return (
      <div className="viewTradesPage flexClm gap_24 pad_24">
        <div className="chart_boxBg flexClm gap_16 pad_32 flex_center text_center">
          <div className="flexClm gap_12">
            <span className="font_16 font_weight_600 error">
              Unable to Load Trades
            </span>
            <span className="font_14 shade_50">{error}</span>
            <div className="flexClm gap_8 font_12 shade_50">
              <span>• Make sure you're using a valid share link</span>
              <span>• The link might have expired or been corrupted</span>
              <span>• Try asking the sender to generate a new share link</span>
            </div>
            <button
              onClick={loadSharedData}
              className="button_secondary font_12 pad_8_16"
            >
              <RefreshCw size={14} />
              Retry Loading
            </button>
          </div>
        </div>
      </div>
    );
  }

  const stats = getStats(sharedData.trades);

  const formatCurrency = (val) =>
    val ? `$${Number(val).toFixed(2)}` : "$0.00";

  const getPnlColorClass = (pnl) =>
    pnl >= 0 ? "success" : pnl < 0 ? "error" : "shade_50";

  return (
    <div className="viewTradesPage flexClm gap_24 pad_24">
      {/* Header */}
      <div className="headerSection flexClm gap_16">
        <div className="flexRow flexRow_stretch">
          <div className="flexClm flex1">
            <span className="font_24 font_weight_600">Trading Performance</span>
            <span className="font_14 shade_50">
              Shared trading results{" "}
              {sharedData.meta.account ? `from ${sharedData.meta.account}` : ""}
            </span>
          </div>
        </div>

        {/* Key Stats */}
        <div className="flexRow flexRow_stretch gap_16">
          <div className="chart_boxBg flexClm gap_8 pad_16 width100">
            <span className="font_12 shade_50">Win Rate</span>
            <span className="font_16 font_weight_600">{stats.winRate}%</span>
          </div>

          <div className="chart_boxBg flexClm gap_8 pad_16 width100">
            <span className="font_12 shade_50">Total Trades</span>
            <span className="font_16 font_weight_600">{stats.totalTrades}</span>
          </div>

          <div className="chart_boxBg flexClm gap_8 pad_16 width100">
            <span className="font_12 shade_50">Total P&L</span>
            <span
              className={`font_16 font_weight_600 ${
                stats.totalPnL >= 0 ? "success" : "error"
              }`}
            >
              {stats.totalPnL >= 0 ? "+" : ""}
              {stats.totalPnL.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Calendar Section */}
      <div className="calendarSection flexClm gap_20">
        <div className="flexRow flexRow_stretch">
          <span className="font_18 font_weight_600">Trading Calendar</span>
          <span className="font_12 shade_50">
            {monthlyStats.totalTrades} trades in {months[selectedMonth - 1]}{" "}
            {selectedYear}
          </span>
        </div>

        {/* Calendar Header */}
        <div className="calendarHeader flexRow flexRow_stretch chart_boxBg pad_16">
          <div className="flexClm">
            <span className="font_weight_600">
              {months[selectedMonth - 1]} {selectedYear}
            </span>
            <span className="font_12">
              {monthlyStats.winRate}% Win Rate •{" "}
              {formatCurrency(monthlyStats.totalPnL)} P&L
            </span>
          </div>

          <div className="flexRow gap_8">
            <button
              className="navButton button_ter flexRow flex_center"
              onClick={() => navigateMonth("prev")}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="navButton button_ter flexRow flex_center"
              onClick={() => navigateMonth("next")}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="calendarGrid chart_boxBg pad_16">
          {/* Weekday Headers */}
          <div className="weekdayHeaders grid grid_7 gap_4 margin_bottom_12">
            {weekdays.map((day) => (
              <div
                key={day}
                className="weekdayHeader text_center font_12 font_weight_600 shade_50"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="calendarDays grid grid_7 gap_4">
            {calendarDays.map((day, index) => {
              const dayTrades = getDateTrades(day);
              const dayPnL = getDatePnL(day);
              const hasTrades = dayTrades.length > 0;
              const isSelected =
                selectedDate ===
                `${selectedYear}-${String(selectedMonth).padStart(
                  2,
                  "0"
                )}-${String(day).padStart(2, "0")}`;

              return (
                <div
                  key={index}
                  className={`calendarDay flexCol gap_2 pad_8 text_center ${
                    !day ? "emptyDay" : ""
                  } ${hasTrades ? "hasTrades" : ""} ${
                    isSelected ? "selectedDay" : ""
                  }`}
                  onClick={() => handleDateClick(day)}
                >
                  {day && (
                    <>
                      <span
                        className={`font_12 font_weight_500 ${
                          !hasTrades ? "shade_50" : ""
                        }`}
                      >
                        {day}
                      </span>
                      {hasTrades && (
                        <div
                          className={`pnlIndicator ${getPnlColorClass(
                            dayPnL
                          )} font_10`}
                        >
                          {dayPnL > 0 ? "+" : ""}
                          {formatCurrency(dayPnL)}
                        </div>
                      )}
                      {hasTrades && (
                        <div className="tradeCount font_10 shade_50">
                          {dayTrades.length} trade
                          {dayTrades.length !== 1 ? "s" : ""}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Details */}
        {selectedDate && tradesByDate[selectedDate] && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="selectedDateDetails chart_boxBg pad_16"
          >
            <div className="flexRow flexRow_stretch margin_bottom_12">
              <span className="font_14 font_weight_600">
                {dayjs(selectedDate).format("MMMM D, YYYY")}
              </span>
              <span className="font_12 shade_50">
                {tradesByDate[selectedDate].length} trades
              </span>
            </div>

            <div className="flexClm gap_8">
              {tradesByDate[selectedDate].slice(0, 3).map((trade, index) => (
                <div key={index} className="flexRow flexRow_stretch font_12">
                  <span className="flex1">{trade.symbol}</span>
                  <span className={`${getPnlColorClass(trade.pnl)}`}>
                    {trade.pnl > 0 ? "+" : ""}
                    {formatCurrency(trade.pnl)}
                  </span>
                </div>
              ))}
              {tradesByDate[selectedDate].length > 3 && (
                <span className="font_10 shade_50 text_center">
                  ... and {tradesByDate[selectedDate].length - 3} more trades
                </span>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Detailed Stats */}
      <div className="flexClm gap_24">
        <span className="font_18 font_weight_600">Performance Overview</span>

        <div className="flexRow gap_16">
          <div className="chart_boxBg flexClm gap_12 pad_16 width100">
            <span className="font_14 font_weight_600">Trade Distribution</span>
            <div className="flexClm gap_8">
              <div className="flexRow flexRow_stretch">
                <span className="font_12 shade_50">Winning Trades</span>
                <span className="font_12 success">
                  {stats.winningTrades} ({stats.winRate}%)
                </span>
              </div>
              <div className="flexRow flexRow_stretch">
                <span className="font_12 shade_50">Losing Trades</span>
                <span className="font_12 error">{stats.losingTrades}</span>
              </div>
              <div className="flexRow flexRow_stretch">
                <span className="font_12 shade_50">Break-even Trades</span>
                <span className="font_12 shade_50">
                  {stats.breakEvenTrades}
                </span>
              </div>
            </div>
          </div>

          <div className="chart_boxBg flexClm gap_12 width100 pad_16">
            <span className="font_14 font_weight_600">Strategy Analysis</span>
            <div className="flexClm gap_8">
              <div className="flexRow flexRow_stretch">
                <span className="font_12 shade_50">Long Trades</span>
                <span className="font_12">{stats.longTrades}</span>
              </div>
              <div className="flexRow flexRow_stretch">
                <span className="font_12 shade_50">Short Trades</span>
                <span className="font_12">{stats.shortTrades}</span>
              </div>
              <div className="flexRow flexRow_stretch">
                <span className="font_12 shade_50">Avg P&L per Trade</span>
                <span
                  className={`font_12 ${
                    stats.avgPnL >= 0 ? "success" : "error"
                  }`}
                >
                  {stats.avgPnL >= 0 ? "+" : ""}
                  {stats.avgPnL}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* All Trades Table */}
      <div className="flexClm gap_16">
        <span className="font_18 font_weight_600">
          All Trades ({sharedData.trades.length})
        </span>

        <div className="flexClm gap_24">
          <AnimatePresence>
            {sharedData.trades.map((trade, index) => (
              <motion.div
                key={trade._id || trade.id || index}
                className="chart_boxBg flexClm gap_12 pad_16"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileHover={{ y: -2 }}
              >
                {/* Header Row */}
                <div className="flexRow flexRow_stretch ">
                  <div className="flexRow gap_12 flex_center">
                    {/* Direction Icon */}
                    <div
                      className={`positionIcon ${
                        trade.direction?.toLowerCase() || "long"
                      }`}
                    >
                      {trade.direction?.toLowerCase() === "long" ? (
                        <ArrowUp size={16} />
                      ) : (
                        <ArrowDown size={16} />
                      )}
                    </div>

                    <div className="flexClm">
                      {/* Symbol */}
                      <span className="font_14">{trade.symbol || "N/A"}</span>

                      {/* Open Time */}
                      <span className="font_12 shade_50">
                        {dayjs(trade.openTime).format("MMM D, YYYY")}
                      </span>
                    </div>
                  </div>

                  {/* P&L */}
                  <div className={`font_16 ${getPnlColorClass(trade.pnl)}`}>
                    {trade.pnl > 0 ? "+" : ""}
                    {formatCurrency(trade.pnl)}
                  </div>
                </div>

                {/* Bottom Info */}
                <div className="flexRow flexRow_stretch">
                  <div className="font_12 shade_50">
                    <span>Size: </span>
                    <span className="font_12">
                      {formatCurrency(trade.quantityUSD)}
                    </span>
                  </div>

                  <div className="font_12 shade_50">
                    <span>Fees: </span>
                    <span>{trade.feeAmount?.toFixed(2) || "0.00"}</span>
                  </div>

                  <span
                    className={`font_12 ${
                      trade.tradeStatus === "closed"
                        ? "success"
                        : trade.tradeStatus === "running"
                        ? "warning"
                        : "shade_50"
                    }`}
                  >
                    Status : {trade.tradeStatus}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <JournalXCTA />
      <GoogleBannerAd />

      {/* Footer */}
      <div className="footerSection flexRow flexRow_center">
        <span className="font_12 shade_50">
          Shared via Trading Journal • {sharedData.meta.totalTrades} trades •
          Generated on{" "}
          {dayjs(sharedData.meta.generatedAt).format("MMM D, YYYY")}
        </span>
      </div>
    </div>
  );
};

export default ViewTrades;
