"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import Head from "next/head";
import { Calendar, History, Layers } from "lucide-react";
import TradesHistory from "@/components/Trades/TradeHistory";
import TradeCalendar from "@/components/Trades/TradeCalendar";
import BottomBar from "@/components/Trades/BottomBar";
import FullPageLoader from "@/components/ui/FullPageLoader";
import GoogleBannerAd from "@/components/ads/GoogleBannerAd";
import TradeCardModal from "@/components/Trades/TradesCard";
import { calculateStats } from "@/utils/calculateStats";
import { getCurrencySymbol } from "@/utils/currencySymbol";
import { useData } from "@/api/DataContext";

const TradesPage = () => {
  const router = useRouter();
  const { accounts, accountTrades, loading, currentAccount } = useData();

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [showCardModal, setShowCardModal] = useState(false);
  const [activeTab, setActiveTab] = useState("history");

  const today = new Date();
  const primaryCurrency = accounts.length > 0 ? accounts[0].currency : "usd";
  const currencySymbol = getCurrencySymbol(primaryCurrency);
  const selectedAccountId = Cookies.get("accountId");

  const selectedAccount = useMemo(() => {
    if (!selectedAccountId) return null;
    return accounts.find((acc) => acc._id === selectedAccountId) || null;
  }, [accounts, selectedAccountId]);

  const selectedTrades = useMemo(() => {
    if (!selectedAccount) return [];
    return accountTrades.filter((t) => t.accountId === selectedAccount._id);
  }, [accountTrades, selectedAccount]);

  const stats = useMemo(() => {
    return calculateStats(selectedTrades);
  }, [selectedTrades]);

  const totalBalance = useMemo(() => {
    if (!selectedAccount) return 0;

    const starting = selectedAccount.startingBalance?.amount || 0;
    const pnlSum = selectedTrades.reduce(
      (sum, t) => sum + (Number(t.pnl) || 0),
      0,
    );

    return starting + pnlSum;
  }, [selectedAccount, selectedTrades]);

  const tabs = [
    { label: "History", value: "history", icon: <History size={18} /> },
    { label: "Calendar", value: "calendar", icon: <Calendar size={18} /> },
    { label: "Cards", value: "showCardModal", icon: <Layers size={18} /> },
  ];

  const years = Array.from({ length: 15 }, (_, i) => today.getFullYear() - i);

  // 🟩 Automatically set current month when switching to calendar
  useEffect(() => {
    if (activeTab === "calendar") {
      setSelectedMonth(today.getMonth() + 1);
      setSelectedYear(today.getFullYear());
    }
  }, [activeTab]);

  // 🟩 Filter trades for the selected account and sort
  const filteredTrades = useMemo(() => {
    if (!selectedAccountId) return [];

    return accountTrades
      .filter((trade) => trade.accountId === selectedAccountId)
      .sort((a, b) => new Date(b.openTime) - new Date(a.openTime));
  }, [accountTrades, selectedAccountId]);

  // 🟩 Redirect if no account selected
  useEffect(() => {
    if (!loading && !selectedAccountId) {
      router.push("/accounts");
    }
  }, [loading, selectedAccountId, router]);

  if (loading) return <FullPageLoader />;

  return (
    <div
      className="flexClm gap_32 pad_16"
      style={{ background: "var(--mobile-bg)" }}
    >
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
          content="Trade History & Calendar | JournalX"
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

      <div
        className="flexRow flexRow_stretch"
        style={{ minWidth: "300px", maxWidth: "800px" }}
      >
        <div className="flexRow gap_12">
          <div className="flexClm">
            <span className="font_24 font_weight_600">Trades</span>
          </div>
        </div>
      </div>

      <div
        className="flexClm gap_32"
        style={{
          minWidth: "300px",
          paddingBottom: "100px",
        }}
      >
        <BottomBar />

        {/* Tabs */}
        <div className="mobile-tabs" style={{ margin: "0" }}>
          {tabs.map((tab) => (
            <button
              key={tab.value}
              className={`tab-item ${activeTab === tab.value ? "active" : ""}`}
              onClick={() => setActiveTab(tab.value)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === "history" && (
          <TradesHistory
            trades={filteredTrades}
            location={router}
            selectedDate={selectedDate}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            years={years}
            setSelectedMonth={setSelectedMonth}
            setSelectedYear={setSelectedYear}
          />
        )}

        {activeTab === "calendar" && (
          <TradeCalendar
            trades={filteredTrades}
            onDateSelect={(dateKey) => {
              setSelectedDate(new Date(dateKey));
              setActiveTab("history");
            }}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            years={years}
            setSelectedMonth={setSelectedMonth}
            setSelectedYear={setSelectedYear}
          />
        )}

        {activeTab === "showCardModal" && (
          <TradeCardModal
            trades={filteredTrades}
            onClose={() => setShowCardModal(false)}
            onAddNew={() => router.push("/add-trade")}
          />
        )}

        <GoogleBannerAd />
      </div>
    </div>
  );
};

export default TradesPage;
