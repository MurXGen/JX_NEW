"use client";

import React, { useState, useEffect } from "react";
import TradeInfo from "./TradeInfo";
import Skeleton from "@/components/ui/Skeleton";
import axios from "axios";
import Cookies from "js-cookie";
import { getFromIndexedDB, saveToIndexedDB } from "@/utils/indexedDB";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  Filter,
  X,
} from "lucide-react";
import { formatCurrency } from "@/utils/formatNumbers";

const TRADE_KEY = "__t_rd_iD";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const TradesHistory = ({
  trades,
  selectedDate,
  location,
  selectedMonth,
  selectedYear,
}) => {
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
    // formData is the serializable object from sessionStorage (no file objects)
    try {
      const apiFormData = new FormData();

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

      // Retrieve images from localStorage (we stored dataUrls in AddTrade)
      const openImagePayload = localStorage.getItem("newTradeImage_openImage");
      const closeImagePayload = localStorage.getItem(
        "newTradeImage_closeImage"
      );

      if (openImagePayload) {
        try {
          const { dataUrl, name, type } = JSON.parse(openImagePayload);
          const file = dataUrlToFile(dataUrl, name, type);
          apiFormData.append("openImage", file);
        } catch (err) {
          console.error("Failed to parse open image payload", err);
        }
      }

      if (closeImagePayload) {
        try {
          const { dataUrl, name, type } = JSON.parse(closeImagePayload);
          const file = dataUrlToFile(dataUrl, name, type);
          apiFormData.append("closeImage", file);
        } catch (err) {
          console.error("Failed to parse close image payload", err);
        }
      }

      // Now do the request (new trade or edit)
      let res;
      if (isEdit) {
        const tradeId = localStorage.getItem(TRADE_KEY);
        res = await axios.put(
          `${API_BASE}/api/trades/update/${tradeId}`,
          apiFormData,
          {
            withCredentials: true,
            headers: { "Content-Type": "multipart/form-data" },
          }
        );
      } else {
        // temporary placeholder UI
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
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      if (res.data?.success) {
        const { accounts, trades } = res.data;

        // ✅ Save to IndexedDB
        await saveToIndexedDB("user-data", {
          userId: localStorage.getItem("userId"),
          accounts,
          trades,
        });

        // ✅ Reload from IndexedDB immediately (replace skeletons with real data)
        const userData = await getFromIndexedDB("user-data");
        const accountId = Cookies.get("accountId");
        const accountTrades = (userData.trades || []).filter(
          (trade) => trade.accountId === accountId
        );

        const sorted = accountTrades.sort(
          (a, b) => new Date(b.openTime) - new Date(a.openTime)
        );

        setDisplayedTrades(sorted); // 🔥 Replace skeletons with real trades

        // ✅ Clear stored images
        localStorage.removeItem("newTradeImage_openImage");
        localStorage.removeItem("newTradeImage_closeImage");

        setToast({
          type: "success",
          message: isEdit
            ? "Trade updated successfully!"
            : "Trade added successfully!",
        });

        // ✅ Instead of reloading page, notify parent if needed
        if (typeof onTradesUpdated === "function") {
          onTradesUpdated();
        }

        // 🔄 Force full page reload after 2 seconds
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        throw new Error("Upload failed");
      }
    } catch (err) {
      console.error("Trade submission failed:", err);

      // ❌ Remove skeletons on error
      setDisplayedTrades((prev) => prev.filter((trade) => !trade.loading));

      setToast({ type: "error", message: err.message || "Upload failed" });
    } finally {
      setLoadingNewTrade(false);
      // ensure flags cleaned
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
            counts[dateKey] = 3; // Show 3 trades initially
          }
        }
      );
      setVisibleTradesCount(counts);
    }
  }, [displayedTrades]);

  const groupTradesByDate = (tradesArray) => {
    return tradesArray.reduce((acc, trade) => {
      // Use closeTime if exists, else openTime
      const dateObj = trade.closeTime
        ? new Date(trade.closeTime)
        : new Date(trade.openTime);
      const dateKey = dateObj.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
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

    // Only filter if month/year selected
    if (monthNum || yearNum) {
      filtered = filtered.filter((trade) => {
        const date = new Date(trade.closeTime);
        const monthMatches = monthNum ? date.getMonth() + 1 === monthNum : true;
        const yearMatches = yearNum ? date.getFullYear() === yearNum : true;
        return monthMatches && yearMatches;
      });
    }

    // Apply PnL filter
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
      // Default sort by openTime (newest → oldest, so future comes first)
      filtered.sort((a, b) => new Date(b.closeTime) - new Date(a.closeTime));
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
                <div
                  key={dateKey}
                  className="dateGroup flexClm gap_12"
                  style={{
                    borderBottom: "5px solid var(--white-4)",
                    paddingBottom: "var(--px-32)",
                  }}
                >
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
                        className="tradeCard chart_boxBg"
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
                                {formatTime(trade.openTime)} {" → "}
                                {trade.closeTime ? (
                                  <>
                                    {formatTime(trade.closeTime)}
                                    {trade.duration > 0 && (
                                      <span style={{ paddingLeft: "4px" }}>
                                        | {trade.duration}hr
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="flex">
                                    <span className="pulseDot"></span> Active
                                  </span>
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
          <div className="emptyState flexClm flex_center">
            <p className="font_16 shade_50">No trades found</p>
          </div>
        )}
      </div>

      {/* Trade Info Modal */}
      {showTradeModal && <TradeInfo onClose={() => setShowTradeModal(false)} />}
    </div>
  );
};

export default TradesHistory;
