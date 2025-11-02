"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import Head from "next/head";
import { getFromIndexedDB } from "@/utils/indexedDB";
import TradesHistory from "@/components/Trades/TradeHistory";
import TradeCalendar from "@/components/Trades/TradeCalendar";
import BottomBar from "@/components/Trades/BottomBar";
import Navbar from "@/components/Trades/Navbar";
import { Calendar, History } from "lucide-react";
import Dropdown from "@/components/ui/Dropdown";
import BackgroundBlur from "@/components/ui/BackgroundBlur";
import FullPageLoader from "@/components/ui/FullPageLoader";
import SectionHeader from "@/components/ui/SectionHeader";
import GoogleBannerAd from "@/components/ads/GoogleBannerAd";

const TradePage = () => {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("history");

  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState(null);

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  const years = Array.from({ length: 15 }, (_, i) => today.getFullYear() - i);

  useEffect(() => {
    setLoading(true);
    const loadTrades = async () => {
      const accountId = Cookies.get("accountId");

      // 🚨 If no account selected, redirect to accounts page
      if (!accountId) {
        router.push("/accounts");
        return;
      }

      const userData = await getFromIndexedDB("user-data");
      if (userData) {
        const accountTrades = (userData.trades || []).filter(
          (trade) => trade.accountId === accountId
        );

        // Sort by openTime (newest first)
        const sorted = accountTrades.sort(
          (a, b) => new Date(b.openTime) - new Date(a.openTime)
        );

        setTrades(sorted);
      }

      setLoading(false);
    };

    loadTrades();
  }, [router]);

  if (loading) return <FullPageLoader />;

  return (
    <>
      {/* ✅ SEO + Meta Tags */}
      <Head>
        <title>JournalX | Trade History & Calendar</title>
        <meta
          name="description"
          content="Track and analyze your trading performance with JournalX's Trade History and Calendar. View all your logged trades, performance summaries, and behavioral insights — all in one clean dashboard."
        />
        <meta
          name="keywords"
          content="trading journal, trade history, trade calendar, forex trading journal, stock trading log, crypto trade tracker, JournalX app, trade performance analytics, trade tracking tool, trading analytics platform, free trading journal"
        />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="JournalX" />
        <meta
          property="og:title"
          content="JournalX | Trade History & Calendar"
        />
        <meta
          property="og:description"
          content="Analyze your trades, identify mistakes, and grow consistently using JournalX’s AI-powered trading journal."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://journalx.app/trades" />
        <meta property="og:image" content="/assets/Journalx_Banner.png" />
        <link rel="canonical" href="https://journalx.app/trades" />
        <meta name="theme-color" content="#000000" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="JournalX | Trade History" />
        <meta
          name="twitter:description"
          content="Visualize and analyze all your trades in one place with JournalX — your AI-powered trading journal."
        />
        <meta name="twitter:image" content="/assets/Journalx_Banner.png" />
      </Head>
      <div className="flexClm gap_32">
        <BottomBar />
        <div className="flexRow flexRow_stretch">
          <SectionHeader
            title="Logged trades"
            description="Logged trades history & calendar"
            level={2} // uses <h2>
            // showButton={accounts.length > 0}
            // buttonLabel="Create journal"
            // onButtonClick={handleCreateAccount}
            // loading={loading}
          />
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

        <GoogleBannerAd />
      </div>
    </>
  );
};

export default TradePage;
