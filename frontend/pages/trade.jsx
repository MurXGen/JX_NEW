"use client";

import React, { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { getFromIndexedDB } from "@/utils/indexedDB";
import TradesHistory from "@/components/Trades/TradeHistory";
import TradeCalendar from "@/components/Trades/TradeCalendar";

const TradePage = () => {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("history"); // default view

  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    const loadTrades = async () => {
      const accountId = Cookies.get("accountId");

      if (!accountId) {
        console.warn("⚠ No account selected, redirecting to accounts page...");
        return;
      }

      const userData = await getFromIndexedDB("user-data");
      if (userData) {
        const accountTrades = (userData.trades || []).filter(
          (trade) => trade.accountId === accountId
        );

        // sort by openTime (newest first)
        const sorted = accountTrades.sort(
          (a, b) => new Date(b.openTime) - new Date(a.openTime)
        );

        setTrades(sorted);
      }

      setLoading(false);
    };

    loadTrades();
  }, []);

  if (loading) return <p>Loading trades...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h1>Trades Dashboard</h1>

      {/* Toggle Buttons */}
      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={() => setView("history")}
          style={{
            marginRight: "10px",
            background: view === "history" ? "#0070f3" : "#ccc",
            color: "white",
            padding: "8px 12px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          History
        </button>
        <button
          onClick={() => setView("calendar")}
          style={{
            background: view === "calendar" ? "#0070f3" : "#ccc",
            color: "white",
            padding: "8px 12px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Calendar
        </button>
      </div>

      {/* Conditional Rendering */}
      {view === "history" && (
        <TradesHistory trades={trades} selectedDate={selectedDate} />
      )}

      {view === "calendar" && (
        <TradeCalendar
          trades={trades}
          onDateSelect={(dateKey) => {
            setSelectedDate(new Date(dateKey)); // ✅ now defined here
            setView("history"); // ✅ switch view
          }}
        />
      )}
    </div>
  );
};

export default TradePage;
