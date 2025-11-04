"use client";

import { childVariants } from "@/animations/motionVariants";
import Skeleton from "@/components/ui/Skeleton";
import { formatCurrency } from "@/utils/formatNumbers";
import { getFromIndexedDB, saveToIndexedDB } from "@/utils/indexedDB";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import Cookies from "js-cookie";
import { ArrowDown, ArrowUp, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation"; // for Next.js 13+ app directory
import { useEffect, useState } from "react";
import TradeInfo from "./TradeInfo";

const TRADE_KEY = "__t_rd_iD";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const TradesHistory = ({
  trades,
  selectedDate,
  location,
  selectedMonth,
  selectedYear,
}) => {
  const router = useRouter();

  const [displayedTrades, setDisplayedTrades] = useState(trades.slice(0, 5));
  const [loadingNewTrade, setLoadingNewTrade] = useState(false);
  const [newTradeId, setNewTradeId] = useState(null);
  const [toast, setToast] = useState({ type: "", message: "" });
  const [visibleCount, setVisibleCount] = useState(20);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [filter, setFilter] = useState("");
  const [expandedDates, setExpandedDates] = useState({});
  const [visibleTradesCount, setVisibleTradesCount] = useState({});
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // helper: convert dataURL to File
  function dataUrlToFile(dataUrl, filename, mimeType) {
    const arr = dataUrl.split(",");
    const mime = arr[0].match(/:(.*?);/)[1] || mimeType;
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename || "image.png", { type: mime });
  }

  useEffect(() => {
    const isNewTrade = location.query?.isNewTrade === "true";
    const storedFormData = JSON.parse(
      sessionStorage.getItem("newTradeData") || "null"
    );
    const isEdit = sessionStorage.getItem("isEditTrade") === "true";

    if (isNewTrade && storedFormData) {
      setLoadingNewTrade(true);
      // call submit and immediately clear session flag to avoid double submit
      submitNewTrade(storedFormData, isEdit);
      sessionStorage.removeItem("newTradeData");
      sessionStorage.removeItem("isEditTrade");
      // clear query param
      window.history.replaceState(null, "", "/trade");
    }
  }, []);

  const submitNewTrade = async (formData, isEdit = false) => {
    try {
      const apiFormData = new FormData();

      const accountId = Cookies.get("accountId");

      // Ensure only a single string is sent
      if (accountId) {
        const parsed = Array.isArray(accountId)
          ? accountId[0]
          : typeof accountId === "string" && accountId.includes("[")
          ? JSON.parse(accountId)[0]
          : accountId;

        apiFormData.append("accountId", parsed);
      }

      // Append all serializable fields (skip previews and _id)
      Object.entries(formData).forEach(([key, value]) => {
        if (
          key === "_id" ||
          key === "openImagePreview" ||
          key === "closeImagePreview"
        )
          return;
        if (Array.isArray(value) || typeof value === "object") {
          apiFormData.append(key, JSON.stringify(value));
        } else if (value !== undefined && value !== null) {
          apiFormData.append(key, value);
        }
      });

      // --- Handle images from localStorage ---
      const openImagePayload = localStorage.getItem("newTradeImage_openImage");
      const closeImagePayload = localStorage.getItem(
        "newTradeImage_closeImage"
      );

      if (openImagePayload) {
        try {
          const { dataUrl, name, type } = JSON.parse(openImagePayload);
          const file = dataUrlToFile(dataUrl, name, type);
          apiFormData.append("openImage", file);
        } catch (err) {}
      }

      if (closeImagePayload) {
        try {
          const { dataUrl, name, type } = JSON.parse(closeImagePayload);
          const file = dataUrlToFile(dataUrl, name, type);
          apiFormData.append("closeImage", file);
        } catch (err) {}
      }

      // --- Send removal flags to backend ---
      apiFormData.append(
        "removeOpenImage",
        formData.openImageRemoved ? "true" : "false"
      );
      apiFormData.append(
        "removeCloseImage",
        formData.closeImageRemoved ? "true" : "false"
      );

      // ✅ Debug logs to verify what’s sent
      for (let pair of apiFormData.entries()) {
      }

      // --- Submit request ---
      let res;
      if (isEdit) {
        const tradeId = localStorage.getItem(TRADE_KEY);
        res = await axios.put(
          `${API_BASE}/api/trades/update/${tradeId}`,
          apiFormData,
          { withCredentials: true }
        );
      } else {
        const tempId = `temp-${Date.now()}`;
        setDisplayedTrades((prev) => [
          {
            _id: tempId,
            loading: true,
            symbol: formData.symbol || "N/A",
            openTime: new Date().toISOString(),
            pnl: 0,
          },
          ...prev,
        ]);

        res = await axios.post(`${API_BASE}/api/trades/addd`, apiFormData, {
          withCredentials: true,
        });
      }

      if (res.data?.success) {
        const { userData, message } = res.data;

        await saveToIndexedDB("user-data", userData);

        const updatedData = await getFromIndexedDB("user-data");
        const accountTrades = (updatedData.trades || []).filter(
          (t) => t.accountId === accountId
        );

        const sortedTrades = accountTrades.sort(
          (a, b) => new Date(b.openTime) - new Date(a.openTime)
        );

        setDisplayedTrades(sortedTrades);

        setToast({
          type: "success",
          message:
            message ||
            (isEdit
              ? "Trade updated successfully!"
              : "Trade added successfully!"),
        });

        // Cleanup
        localStorage.removeItem("newTradeImage_openImage");
        localStorage.removeItem("newTradeImage_closeImage");
        sessionStorage.removeItem("newTradeData");
        sessionStorage.removeItem("isEditTrade");

        setTimeout(() => {
          router.push("/trade");
        }, 1200);
      } else {
        throw new Error("Upload failed");
      }
    } catch (err) {
      setDisplayedTrades((prev) => prev.filter((trade) => !trade.loading));
      setToast({ type: "error", message: err.message || "Upload failed" });
    } finally {
      setLoadingNewTrade(false);
      sessionStorage.removeItem("newTradeData");
      sessionStorage.removeItem("isEditTrade");
      window.history.replaceState(null, "", "/trade");
    }
  };

  useEffect(() => {
    applyFilters(); // reads current selectedMonth, selectedYear, filter by default
  }, [trades, selectedDate, selectedMonth, selectedYear, filter, visibleCount]);

  // Initialize visible trades count for each date group
  useEffect(() => {
    if (displayedTrades.length > 0) {
      const counts = {};
      Object.entries(groupTradesByDate(displayedTrades)).forEach(
        ([dateKey, tradesForDay]) => {
          if (!counts[dateKey]) {
            counts[dateKey] = 3; // show 3 trades initially
          }
        }
      );
      setVisibleTradesCount(counts);
    }
  }, [displayedTrades]);

  const groupTradesByDate = (tradesArray) => {
    return tradesArray.reduce((acc, trade) => {
      // Skip trades without openTime (we need at least openTime)
      if (!trade.openTime) return acc;

      // Use openTime always for grouping (even if closeTime exists)
      const dateObj = new Date(trade.openTime);

      // Skip invalid dates
      if (!dateObj || isNaN(dateObj.getTime())) return acc;

      const dateKey = dateObj.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(trade);

      return acc;
    }, {});
  };

  const handleTradeClick = (tradeId) => {
    localStorage.setItem(TRADE_KEY, tradeId); // store trade ID secretly
    setShowTradeModal(true); // open modal
  };

  // const handleFilterClick = (type) => {
  //   setFilter((prev) => (prev === type ? "" : type));
  //   setShowFilterMenu(false);
  // };

  const toggleDateExpansion = (dateKey) => {
    setExpandedDates((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }));
  };

  // Expand to show all trades
  const loadMoreTrades = (dateKey, tradesForDay) => {
    setVisibleTradesCount((prev) => ({
      ...prev,
      [dateKey]: tradesForDay.length, // show all
    }));
    setExpandedDates((prev) => ({
      ...prev,
      [dateKey]: true,
    }));
  };

  // Collapse back to 3 trades
  const collapseTrades = (dateKey) => {
    setVisibleTradesCount((prev) => ({
      ...prev,
      [dateKey]: 3,
    }));
    setExpandedDates((prev) => ({
      ...prev,
      [dateKey]: false,
    }));
  };

  // Format time to AM/PM based on browser locale
  const formatTime = (dateString) => {
    if (!dateString) return "Active";
    const date = new Date(dateString);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Get PnL color class
  const getPnlColorClass = (pnl) => {
    if (pnl > 0) return "success";
    if (pnl < 0) return "error";
    return "shade_50";
  };

  // Get position shadow color
  // const getPositionShadow = (direction) => {
  //   return direction?.toLowerCase() === "long"
  //     ? "0 0px 10px var(--success-20)"
  //     : "0 0px 10px var(--error-20)";
  // };

  const applyFilters = (
    month = selectedMonth,
    year = selectedYear,
    pnlFilter = filter
  ) => {
    let filtered = Array.isArray(trades) ? [...trades] : [];

    const monthNum = month === "" || month === null ? null : Number(month);
    const yearNum = year === "" || year === null ? null : Number(year);

    if (monthNum || yearNum) {
      filtered = filtered.filter((trade) => {
        if (!trade.openTime) return false;
        const date = new Date(trade.openTime);
        const monthMatches = monthNum ? date.getMonth() + 1 === monthNum : true;
        const yearMatches = yearNum ? date.getFullYear() === yearNum : true;
        return monthMatches && yearMatches;
      });
    }

    // Apply PnL filters
    if (pnlFilter === "profit") {
      filtered = filtered
        .filter((t) => Number(t.pnl) > 0)
        .sort((a, b) => Number(b.pnl) - Number(a.pnl));
    } else if (pnlFilter === "loss") {
      filtered = filtered
        .filter((t) => Number(t.pnl) < 0)
        .sort((a, b) => Number(a.pnl) - Number(b.pnl));
    } else if (pnlFilter === "breakeven") {
      filtered = filtered.filter((t) => Number(t.pnl) === 0);
    } else {
      // Default: sort by openTime (newest first)
      filtered.sort((a, b) => new Date(b.openTime) - new Date(a.openTime));
    }

    setDisplayedTrades(filtered.slice(0, visibleCount));
  };

  const groupedTrades = groupTradesByDate(displayedTrades);

  return (
    <div
      style={
        {
          // borderTop: "1px solid var(--white-20)",
          // paddingTop: "var(--px-32)",
        }
      }
    >
      {/* Trades List */}
      <div className="tradesList">
        {/* Skeleton placeholder for new trade */}
        {loadingNewTrade && <Skeleton message="Adding your new trade..." />}

        {/* Trades List */}
        {Object.keys(groupedTrades).length > 0 ? (
          <div className="flexClm gap_32">
            {Object.entries(groupedTrades).map(([dateKey, tradesForDay]) => {
              const visibleTrades = expandedDates[dateKey]
                ? tradesForDay
                : tradesForDay.slice(0, visibleTradesCount[dateKey] || 3);

              const hasMoreTrades = tradesForDay.length > visibleTrades.length;

              // Use dateKey as the header date
              const headerDate = new Date(dateKey);

              return (
                <div key={dateKey} className="boxBg flexClm gap_12">
                  {/* Date Header */}
                  <motion.div
                    className="dateHeader flexRow flexRow_stretch"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flexRow gap_12">
                      <span className="dayPart">
                        {headerDate.toLocaleDateString("en-US", {
                          weekday: "short",
                        })}
                      </span>
                      <span className="datePart">
                        {headerDate.toLocaleDateString("en-US", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </motion.div>

                  {/* Trades List */}
                  <AnimatePresence>
                    {visibleTrades.map((trade, index) => (
                      <motion.div
                        key={trade._id || trade.id || index}
                        className="tradeCard boxBg pad_16"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        onClick={() => handleTradeClick(trade._id)}
                        whileHover={{ y: -2 }}
                      >
                        <div className="flexRow flexRow_stretch">
                          <div className="flexRow gap_12">
                            {/* Position Icon */}
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
                              {/* Ticker Name */}
                              <span className="font_14">
                                {trade.symbol || "N/A"}
                              </span>

                              {/* Open & Close Time */}
                              <span className="font_12 shade_50 gap_8">
                                {trade.openTime &&
                                !isNaN(new Date(trade.openTime).getTime())
                                  ? formatTime(trade.openTime)
                                  : "N/A"}{" "}
                                {trade.closeTime &&
                                !isNaN(new Date(trade.closeTime).getTime()) ? (
                                  <>
                                    {" → "}
                                    {formatTime(trade.closeTime)}
                                    {trade.duration > 0 && (
                                      <span style={{ paddingLeft: "4px" }}>
                                        | {trade.duration}hr
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  trade.openTime &&
                                  !isNaN(
                                    new Date(trade.openTime).getTime()
                                  ) && (
                                    <span className="flex">
                                      <span className="pulseDot"></span> Active
                                    </span>
                                  )
                                )}
                              </span>
                            </div>
                          </div>

                          {/* PnL */}
                          <div
                            className={`font_16 ${getPnlColorClass(trade.pnl)}`}
                          >
                            {trade.pnl > 0 ? "+" : ""}
                            {formatCurrency(trade.pnl)}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Load More / Show Less Button */}
                  {tradesForDay.length > 3 && (
                    <motion.button
                      className="button_ter flexRow flex_center gap_4"
                      onClick={
                        () =>
                          expandedDates[dateKey]
                            ? collapseTrades(dateKey) // Collapse back to 3
                            : loadMoreTrades(dateKey, tradesForDay) // Show all
                      }
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {expandedDates[dateKey] ? (
                        <>
                          Show less <ArrowUp size={16} />
                        </>
                      ) : (
                        <>
                          <ArrowDown size={16} /> Show all (
                          {tradesForDay.length - visibleTrades.length}{" "}
                          remaining)
                        </>
                      )}
                    </motion.button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <motion.div className="notFound" variants={childVariants}>
            <TrendingUp size={48} className="vector" />
            {/* Market/Trading icon */}
            <span className="font_12">
              No trades found. You can start logging trades
            </span>
            <button
              className="button_sec flexRow"
              onClick={() => router.push("/add-trade")}
            >
              <span>Add trade</span>
            </button>
          </motion.div>
        )}
      </div>

      {/* Trade Info Modal */}
      {showTradeModal && <TradeInfo onClose={() => setShowTradeModal(false)} />}
    </div>
  );
};

export default TradesHistory;
