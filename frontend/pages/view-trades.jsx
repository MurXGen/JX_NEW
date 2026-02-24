"use client";

import GoogleBannerAd from "@/components/ads/GoogleBannerAd";
import FullPageLoader from "@/components/ui/FullPageLoader";
import JournalXCTA from "@/components/ui/JournalXCTA";
import dayjs from "dayjs";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, RefreshCw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

const ViewTrades = () => {
  const [sharedData, setSharedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isClient, setIsClient] = useState(false);
  const [calendarView, setCalendarView] = useState("month"); // 'month' or 'year'
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showAllMonths, setShowAllMonths] = useState(false);
  const router = useRouter();

  const searchParams = useSearchParams();

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
          "No trade data found in the URL. Please check that you're using a valid share link.",
        );
        setLoading(false);
        return;
      }

      // Decode base64 data
      try {
        const cleanData = dataParam.replace(/\s/g, "+");
        const decodedData = atob(cleanData);
        const parsedData = JSON.parse(decodedData);

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
          "Failed to parse trade data. The link may be corrupted or expired.",
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

    const startDay = (firstDay.getDay() + 6) % 7;
    const totalDays = lastDay.getDate();

    const days = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let d = 1; d <= totalDays; d++) days.push(d);

    return days;
  }, [selectedMonth, selectedYear]);

  const tradesByDate = useMemo(() => {
    if (!sharedData?.trades) return {};
    const grouped = {};
    sharedData.trades.forEach((t) => {
      const d = new Date(t.openTime);
      const dateStr = d.toLocaleDateString("en-CA");
      if (!grouped[dateStr]) grouped[dateStr] = [];
      grouped[dateStr].push(t);
    });
    return grouped;
  }, [sharedData?.trades]);

  const monthlyTrades = useMemo(() => {
    if (!selectedMonth || !selectedYear || !sharedData?.trades) return [];
    return sharedData.trades.filter((trade) => {
      const d = new Date(trade.openTime);
      return (
        d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear
      );
    });
  }, [sharedData?.trades, selectedMonth, selectedYear]);

  const yearlyTrades = useMemo(() => {
    if (!selectedYear || !sharedData?.trades) return [];
    return sharedData.trades.filter(
      (trade) => new Date(trade.openTime).getFullYear() === selectedYear,
    );
  }, [sharedData?.trades, selectedYear]);

  const monthlyStats = useMemo(() => {
    let totalTrades = monthlyTrades.length;
    let winTrades = monthlyTrades.filter((t) => t.pnl > 0).length;
    let loseTrades = monthlyTrades.filter((t) => t.pnl < 0).length;
    let totalPnl = monthlyTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    let winRate = totalTrades > 0 ? (winTrades / totalTrades) * 100 : 0;

    return { totalTrades, winTrades, loseTrades, totalPnl, winRate };
  }, [monthlyTrades]);

  const yearlyStats = useMemo(() => {
    let totalTrades = yearlyTrades.length;
    let winTrades = yearlyTrades.filter((t) => t.pnl > 0).length;
    let loseTrades = yearlyTrades.filter((t) => t.pnl < 0).length;
    let totalPnl = yearlyTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    let winRate = totalTrades > 0 ? (winTrades / totalTrades) * 100 : 0;

    return { totalTrades, winTrades, loseTrades, totalPnl, winRate };
  }, [yearlyTrades]);

  const currentStats = calendarView === "month" ? monthlyStats : yearlyStats;

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

  const handleDateClick = (dateStr, dayTrades) => {
    if (dayTrades && dayTrades.length > 0) {
      setSelectedDate(dateStr);
    }
  };

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

  const getStats = (tradesData) => {
    const totalTrades = tradesData.length;
    const winningTrades = tradesData.filter((t) => t.pnl > 0).length;
    const losingTrades = tradesData.filter((t) => t.pnl < 0).length;
    const breakEvenTrades = tradesData.filter((t) => t.pnl === 0).length;
    const totalPnL = tradesData.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const avgPnL = totalTrades > 0 ? totalPnL / totalTrades : 0;

    const bestTrade = [...tradesData].sort((a, b) => b.pnl - a.pnl)[0];
    const worstTrade = [...tradesData].sort((a, b) => a.pnl - b.pnl)[0];

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

  const formatNumber = (num) => {
    return (
      num?.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) || "0.00"
    );
  };

  if (loading) {
    return <FullPageLoader />;
  }

  if (error || !sharedData) {
    return (
      <div
        className="flexClm flex_center"
        style={{
          minHeight: "100vh",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <div
          className="flexClm gap_16 flex_center"
          style={{
            maxWidth: "420px",
            width: "100%",
          }}
        >
          {/* GIF */}
          <img
            src="/assets/no-data.gif"
            alt="Invalid Link"
            width={180}
            height={180}
            style={{ objectFit: "contain" }}
          />

          {/* Heading */}
          <span className="font_20 font_weight_600 error">
            Not a Valid Link
          </span>

          {/* Description */}
          <span className="font_14 shade_70">
            This shared trade link appears to be invalid or expired.
          </span>

          <div className="flexClm gap_6 font_14 shade_60">
            <span>Please ask the person who shared it with you</span>
            <span>to generate a new share link and try again.</span>
          </div>

          {/* Retry Button */}
          <div className="flexRow gap_12">
            <button
              onClick={loadSharedData}
              className="primary-btn secondary-btn font_14"
            >
              Retry
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="primary-btn font_14"
            >
              Back to dashboard
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
    <div
      className="viewTradesPage flexClm gap_24 pad_24"
      style={{
        maxWidth: "1200px",
        minWidth: "300px",
        margin: "24px auto",
        padding: "0 12px 100px 12px",
      }}
    >
      {/* Header */}

      <div className="flexRow flexRow_stretch">
        <div className="flexClm flex1">
          <span className="font_24 font_weight_600">Trading Performance</span>
          <span className="font_14 ">
            Shared trading results{" "}
            {sharedData.meta.account ? `from ${sharedData.meta.account}` : ""}
          </span>
        </div>
      </div>

      <div className="gridContainer">
        <div className="flexClm gap_24 width100">
          <div className="headerSection flexClm gap_16">
            {/* Key Stats */}
            <div className="flexRow flexRow_stretch gap_16">
              <div className="stats-card radius-12 flexClm gap_8 pad_16 width100">
                <span className="font_14">Win Rate</span>
                <span className="font_16 font_weight_600">
                  {stats.winRate}%
                </span>
              </div>

              <div className="stats-card radius-12 flexClm gap_8 pad_16 width100">
                <span className="font_14">Total Trades</span>
                <span className="font_16 font_weight_600">
                  {stats.totalTrades}
                </span>
              </div>

              <div className="stats-card radius-12 flexClm gap_8 pad_16 width100">
                <span className="font_14">Total P&L</span>
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
          <div className="calendarSection flexClm gap_24">
            {/* Calendar Header */}
            {calendarView === "month" && (
              <div className="calendarHeader flexRow flexRow_stretch">
                <div className="flexClm">
                  <span className="font_weight_600">
                    {selectedMonth
                      ? `${new Date(0, selectedMonth - 1).toLocaleString(
                          "default",
                          {
                            month: "long",
                          },
                        )} ${selectedYear}`
                      : "All Months"}
                  </span>
                  <span className="font_14">Overview</span>
                </div>
              </div>
            )}

            {/* Calendar View */}
            <AnimatePresence mode="wait">
              {calendarView === "month" && (
                <motion.div
                  key="month-view"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="monthView boxBg pad_16"
                >
                  {/* Weekday Headers */}
                  <div className="weekdayHeaders flexRow">
                    {weekdays.map((day) => (
                      <div
                        key={day}
                        className="weekdayHeader font_14 font_weight_600 text_center"
                      >
                        {day.substring(0, 1)}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Grid */}
                  <div className="calendarGrid">
                    {calendarDays.map((day, i) => {
                      if (!day) return <div key={i} className="emptyDay"></div>;

                      const dateStr = `${selectedYear}-${String(
                        selectedMonth,
                      ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const dayTrades = tradesByDate[dateStr] || [];
                      const pnl = dayTrades.reduce(
                        (sum, t) => sum + (t.pnl || 0),
                        0,
                      );
                      const hasTrades = dayTrades.length > 0;

                      const todayStr = new Date().toISOString().split("T")[0];
                      const isToday = dateStr === todayStr;

                      return (
                        <motion.div
                          key={i}
                          className={`calendarDay ${
                            hasTrades ? "hasTrades" : ""
                          } 
                        ${selectedDate === dateStr ? "selected" : ""} 
                        ${
                          pnl > 0
                            ? "success"
                            : pnl < 0
                              ? "error"
                              : hasTrades
                                ? "shade_50"
                                : ""
                        } 
                        ${isToday ? "today" : ""}`}
                          onClick={() => handleDateClick(dateStr, dayTrades)}
                          whileHover={{ scale: hasTrades ? 1.05 : 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <span className="dayNumber font_12">{day}</span>
                          {hasTrades && (
                            <div className="dayInfo">
                              <div
                                className={`pnlIndicator font_10 ${
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
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flexClm gap_24 width100">
          {/* Detailed Stats */}
          <div className="flexClm gap_24">
            {/* <span className="font_18 font_weight_600">
              Performance Overview
            </span> */}

            <div className="flexRow gap_16">
              <div className="boxBg flexClm gap_12 pad_16 width100">
                <span className="font_14 font_weight_600">
                  Trade Distribution
                </span>
                <div className="flexClm gap_8">
                  <div className="flexRow flexRow_stretch">
                    <span className="font_14">Winning Trades</span>
                    <span className="font_12 success">
                      {stats.winningTrades} ({stats.winRate}%)
                    </span>
                  </div>
                  <div className="flexRow flexRow_stretch">
                    <span className="font_14">Losing Trades</span>
                    <span className="font_12 error">{stats.losingTrades}</span>
                  </div>
                  <div className="flexRow flexRow_stretch">
                    <span className="font_14">Break-even Trades</span>
                    <span className="font_14">{stats.breakEvenTrades}</span>
                  </div>
                </div>
              </div>

              <div className="boxBg flexClm gap_12 width100 pad_16">
                <span className="font_14 font_weight_600">
                  Strategy Analysis
                </span>
                <div className="flexClm gap_8">
                  <div className="flexRow flexRow_stretch">
                    <span className="font_14">Long Trades</span>
                    <span className="font_14">{stats.longTrades}</span>
                  </div>
                  <div className="flexRow flexRow_stretch">
                    <span className="font_14">Short Trades</span>
                    <span className="font_14">{stats.shortTrades}</span>
                  </div>
                  <div className="flexRow flexRow_stretch">
                    <span className="font_14">Avg P&L per Trade</span>
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
                    className="stats-card radius-12 flexClm gap_12 pad_16"
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
                          <span className="font_14">
                            {trade.symbol || "N/A"}
                          </span>
                          <div className="font_14">
                            <span>Margin: </span>
                            <span className="font_14">
                              {formatCurrency(trade.quantityUSD)}
                            </span>
                          </div>

                          {/* Open Time */}
                          <span className="font_14">
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
                    {/* <div className="flexRow flexRow_stretch">
                      <div className="font_14">
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
                    </div> */}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
          {/* Footer */}
          <div className="footerSection flexRow flexRow_center">
            <span className="font_14">
              Shared via Trading Journal • {sharedData.meta.totalTrades} trades
              • Generated on{" "}
              {dayjs(sharedData.meta.generatedAt).format("MMM D, YYYY")}
            </span>
          </div>
        </div>
      </div>
      <JournalXCTA />
      <GoogleBannerAd />
    </div>
  );
};

export default ViewTrades;
