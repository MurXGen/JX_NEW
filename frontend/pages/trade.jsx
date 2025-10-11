"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import { getFromIndexedDB } from "@/utils/indexedDB";
import TradesHistory from "@/components/Trades/TradeHistory";
import TradeCalendar from "@/components/Trades/TradeCalendar";
import BottomBar from "@/components/Trades/BottomBar";
import Navbar from "@/components/Trades/Navbar";
import { Calendar, History } from "lucide-react";
import Dropdown from "@/components/ui/Dropdown";
import BackgroundBlur from "@/components/ui/BackgroundBlur";
import FullPageLoader from "@/components/ui/FullPageLoader";

const TradePage = () => {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("history");

  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState(null);

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  const years = Array.from({ length: 15 }, (_, i) => today.getFullYear() - i);

  useEffect(() => {
    const loadTrades = async () => {
      const accountId = Cookies.get("accountId");

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

  if (loading) return <FullPageLoader />;

  return (
    <div className="flexClm gap_32">
      <BottomBar />
      <div className="flexRow flexRow_stretch">
        <div className="flexClm">
          <span className="font_20">Trades History</span>
          <span className="font_12">Log trade in seconds</span>
        </div>
        {/* Toggle Buttons */}
        <div className="view-toggle flexRow gap_12">
          <button
            onClick={() => setView("history")}
            className={`toggle-btn ${view === "history" ? "active" : ""}`}
          >
            <History size={18} />
          </button>

          <button
            onClick={() => setView("calendar")}
            className={`toggle-btn ${view === "calendar" ? "active" : ""}`}
          >
            <Calendar size={18} />
          </button>
        </div>
      </div>

      <div className="flexRow flexRow_stretch">
        {/* Global Month/Year Selectors */}
        <div className="flexRow gap_12">
          {/* Month Selector */}
          <Dropdown
            value={selectedMonth}
            onChange={(val) => setSelectedMonth(val)}
            placeholder={view === "history" ? "All Months" : "Select Month"}
            options={[
              ...(view === "history"
                ? [{ value: "", label: "All" }] // ✅ only show in history
                : []),
              ...Array.from({ length: 12 }, (_, i) => ({
                value: i + 1,
                label: new Date(0, i).toLocaleString("default", {
                  month: "long",
                }),
              })),
            ]}
          />

          {/* Year Selector */}
          <Dropdown
            value={selectedYear}
            onChange={(val) => setSelectedYear(val)}
            placeholder={view === "history" ? "All Years" : "Select Year"}
            options={[
              ...(view === "history"
                ? [{ value: "", label: "All" }] // ✅ only show in history
                : []),
              ...years.map((year) => ({ value: year, label: year })),
            ]}
          />
        </div>
      </div>

      {view === "history" && (
        <TradesHistory
          trades={trades}
          location={router}
          selectedDate={selectedDate}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          years={years}
          setSelectedMonth={setSelectedMonth}
          setSelectedYear={setSelectedYear}
          // onTradesUpdated={handleTradesUpdated} // ✅ here
        />
      )}

      {view === "calendar" && (
        <TradeCalendar
          trades={trades}
          onDateSelect={(dateKey) => {
            setSelectedDate(new Date(dateKey));
            setView("history");
          }}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          years={years} // ✅ pass years here
          setSelectedMonth={setSelectedMonth}
          setSelectedYear={setSelectedYear}
        />
      )}
      <BackgroundBlur />
    </div>
  );
};

export default TradePage;
