"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { getFromIndexedDB } from "@/utils/indexedDB";
import FullPageLoader from "@/components/ui/FullPageLoader";
import Overview from "@/components/Tabs/Overview";
import LongShorts from "@/components/Tabs/Long_short";
import TickerAnalysis from "@/components/Tabs/Ticketoverview";
import MarketNews from "@/components/Tabs/MarketNews";
import BackgroundBlur from "@/components/ui/BackgroundBlur";
import Navbar from "@/components/Trades/Navbar";
import BottomBar from "@/components/Trades/BottomBar";

export default function Home() {
  const router = useRouter();
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const loadTrades = async () => {
      const accountId = Cookies.get("accountId");

      if (!accountId) {
        router.push("/accounts");
        return;
      }

      const userData = await getFromIndexedDB("user-data");

      if (userData) {
        const account = (userData.accounts || []).find(
          (acc) => acc._id === accountId
        );

        if (account?.currency) {
          // ✅ Save currency in localStorage
          localStorage.setItem("currencyCode", account.currency);
        }

        const accountTrades = (userData.trades || []).filter(
          (trade) => trade.accountId === accountId
        );

        setTrades(accountTrades);

        if (accountTrades.length > 0) {
          // ✅ Pass currency from localStorage instead of directly
          const currencyFromLS = localStorage.getItem("currencyCode");
          calculateStats(accountTrades, currencyFromLS);
        }
      }

      setLoading(false);
    };

    loadTrades();
  }, [router]);

  const calculateStats = (accountTrades) => {
    const pnlValues = accountTrades.map((t) => t.pnl || 0);

    // 🔹 Net PnL (sum of all trades)
    const netPnL = pnlValues.reduce((sum, p) => sum + p, 0);

    const maxProfit = Math.max(...pnlValues.filter((p) => p > 0), 0);
    const maxLoss = Math.min(...pnlValues.filter((p) => p < 0), 0);
    const totalTrades = accountTrades.length;

    // streak
    const last10 = accountTrades.slice(-10);
    let streakType = null;
    let streakCount = 0;
    for (let i = last10.length - 1; i >= 0; i--) {
      const result =
        last10[i].pnl > 0 ? "win" : last10[i].pnl < 0 ? "loss" : "break-even";

      if (!streakType) {
        streakType = result;
        streakCount = 1;
      } else if (streakType === result) {
        streakCount++;
      } else {
        break;
      }
    }

    const uniqueSymbols = new Set(accountTrades.map((t) => t.symbol)).size;
    const winTrades = accountTrades.filter((t) => t.pnl > 0).length;
    const loseTrades = accountTrades.filter((t) => t.pnl < 0).length;

    // best/worst time ranges
    const timeRanges = [
      { label: "Night", start: 0, end: 6 },
      { label: "Morning", start: 6, end: 12 },
      { label: "Afternoon", start: 12, end: 18 },
      { label: "Evening", start: 18, end: 24 },
    ];

    const pnlByTimeRange = {
      Night: 0,
      Morning: 0,
      Afternoon: 0,
      Evening: 0,
    };

    accountTrades.forEach((trade) => {
      const date = new Date(trade.closeTime);
      const hour = date.getHours();
      const range = timeRanges.find((r) => hour >= r.start && hour < r.end);
      if (range) pnlByTimeRange[range.label] += trade.pnl || 0;
    });

    const winRatio = totalTrades > 0 ? (winTrades / totalTrades) * 100 : 0;
    const averagePnL = totalTrades > 0 ? netPnL / totalTrades : 0;

    const bestTimeLabel = Object.entries(pnlByTimeRange).reduce((a, b) =>
      b[1] > a[1] ? b : a
    )[0];
    const worstTimeLabel = Object.entries(pnlByTimeRange).reduce((a, b) =>
      b[1] < a[1] ? b : a
    )[0];

    const totalVolume = accountTrades.reduce(
      (sum, trade) => sum + (trade.totalQuantity || 0),
      0
    );

    // daily data
    const dailyPnL = {};
    accountTrades.forEach((trade) => {
      const date = new Date(
        trade.closeTime || trade.openTime
      ).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      dailyPnL[date] = (dailyPnL[date] || 0) + (trade.pnl || 0);
    });

    const dailyData = Object.entries(dailyPnL)
      .map(([date, pnl]) => ({ date, pnl }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Greed & Fear
    let gfIndex = 50;
    last10.forEach((trade) => {
      if (trade.pnl > 0) gfIndex += 5;
      else if (trade.pnl < 0) gfIndex -= 5;
    });
    gfIndex = Math.max(0, Math.min(100, gfIndex));
    const gfLabel = gfIndex < 50 ? "Fear" : gfIndex > 50 ? "Greed" : "Neutral";

    setStats({
      netPnL, // 🔹 sum of all trades
      maxProfit,
      maxLoss,
      totalTrades,
      streak: `${streakCount} ${streakType || ""}`,
      totalSymbols: uniqueSymbols,
      winTrades,
      loseTrades,
      dailyData,
      last10,
      greedFear: { value: gfIndex, label: gfLabel },
      bestTime: bestTimeLabel,
      worstTime: worstTimeLabel,
      winRatio: winRatio.toFixed(2),
      averagePnL: averagePnL.toFixed(2),
      totalVolume,
    });
  };

  if (loading) {
    return <FullPageLoader />;
  }

  return (
    <div className="flexClm gap_32">
      <Navbar />
      {/* Tabs */}
      <div
        className="flexRow gap_12 removeScrollBar"
        style={{ overflowX: "scroll" }}
      >
        {[
          { key: "overview", label: "Overview" },
          { key: "longshorts", label: "Long/Shorts" },
          { key: "ticker", label: "Ticker Analysis" },
          { key: "news", label: "Market News" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flexRow button_ter font_12 ${
              activeTab === tab.key ? "active_tab" : ""
            }`}
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minWidth: "120px",
            }}
          >
            {tab.label}
          </button>
        ))}
        <BottomBar />
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && <Overview stats={stats} trades={trades} />}
      {activeTab === "longshorts" && <LongShorts trades={trades} />}
      {activeTab === "ticker" && <TickerAnalysis trades={trades} />}
      {activeTab === "news" && <MarketNews />}

      <BackgroundBlur />
    </div>
  );
}
