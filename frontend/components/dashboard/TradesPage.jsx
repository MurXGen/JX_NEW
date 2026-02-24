"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import Head from "next/head";
import { getFromIndexedDB } from "@/utils/indexedDB";
import TradesHistory from "@/components/Trades/TradeHistory";
import TradeCalendar from "@/components/Trades/TradeCalendar";
import BottomBar from "@/components/Trades/BottomBar";
import Navbar from "@/components/Trades/Navbar";
import { Calendar, History, Home, Layers, ListFilterIcon } from "lucide-react";
import Dropdown from "@/components/ui/Dropdown";
import BackgroundBlur from "@/components/ui/BackgroundBlur";
import FullPageLoader from "@/components/ui/FullPageLoader";
import SectionHeader from "@/components/ui/SectionHeader";
import GoogleBannerAd from "@/components/ads/GoogleBannerAd";
import TradeCardModal from "@/components/Trades/TradesCard";
import HeroCards from "@/components/dashboardMobile/HeroCards";
import { calculateStats } from "@/utils/calculateStats";
import { getCurrencySymbol } from "@/utils/currencySymbol";
import { fetchAccountsAndTrades } from "@/utils/fetchAccountAndTrades";

const TradesWebPage = () => {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState(null);

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState("");
  // const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedYear, setSelectedYear] = useState("");
  const [showCardModal, setShowCardModal] = useState(false);
  const [activeTab, setActiveTab] = useState("history");
  const [accounts, setAccounts] = useState([]);
  const [userPlan, setUserPlan] = useState(null);

  const primaryCurrency = accounts.length > 0 ? accounts[0].currency : "usd";

  const currencySymbol = getCurrencySymbol(primaryCurrency);

  const selectedAccountId = Cookies.get("accountId");

  const selectedAccount = useMemo(() => {
    if (!selectedAccountId) return null;
    return accounts.find((acc) => acc._id === selectedAccountId) || null;
  }, [accounts, selectedAccountId]);

  const selectedTrades = useMemo(() => {
    if (!selectedAccount) return [];
    return trades.filter((t) => t.accountId === selectedAccount._id);
  }, [trades, selectedAccount]);

  useEffect(() => {
    const loadData = async () => {
      const data = await fetchAccountsAndTrades();

      if (data?.redirectToLogin) {
        window.location.href = "/login";
        return;
      }

      setAccounts(data.accounts || []);
      setTrades(data.trades || []);
      setUserPlan(data.userPlan || null);

      setLoading(false);
    };

    loadData();
  }, []);

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

  // 🟩 Automatically set current month when switching to calendar
  useEffect(() => {
    if (activeTab === "calendar") {
      setSelectedMonth(today.getMonth() + 1); // JS months are 0-based
      setSelectedYear(today.getFullYear());
    }
  }, [activeTab]);

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
          (trade) => trade.accountId === accountId,
        );

        // Sort by openTime (newest first)
        const sorted = accountTrades.sort(
          (a, b) => new Date(b.openTime) - new Date(a.openTime),
        );

        setTrades(sorted);
      }

      setLoading(false);
    };

    loadTrades();
  }, [router]);

  if (loading) return <FullPageLoader />;

  return (
    <div className="flexClm gap_32 pad_16">
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

        {activeTab === "calendar" && (
          <TradeCalendar
            trades={trades}
            onDateSelect={(dateKey) => {
              setSelectedDate(new Date(dateKey));
              setActiveTab("history");
            }}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            years={years} // ✅ pass years here
            setSelectedMonth={setSelectedMonth}
            setSelectedYear={setSelectedYear}
          />
        )}

        {activeTab === "showCardModal" && (
          <TradeCardModal
            trades={trades}
            onClose={() => setShowCardModal(false)}
            onAddNew={() => router.push("/add-trade")}
          />
        )}
        {/* <BackgroundBlur /> */}

        <GoogleBannerAd />
      </div>
    </div>
  );
};

export default TradesWebPage;
