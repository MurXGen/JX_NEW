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

    const netPnL = pnlValues.reduce((sum, p) => sum + p, 0);
    const totalFees = accountTrades.reduce(
      (sum, trade) => sum + (trade.feeAmount || 0),
      0
    );

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

    // 🔹 Best / Worst Time calculation
    const timeRanges = [
      { label: "Night", start: 0, end: 6 },
      { label: "Morning", start: 6, end: 12 },
      { label: "Afternoon", start: 12, end: 18 },
      { label: "Evening", start: 18, end: 24 },
    ];

    const pnlByTimeRange = { Night: 0, Morning: 0, Afternoon: 0, Evening: 0 };

    accountTrades.forEach((trade) => {
      const hour = new Date(trade.closeTime || trade.openTime).getHours();
      const range = timeRanges.find((r) => hour >= r.start && hour < r.end);

      if (range) {
        pnlByTimeRange[range.label] += trade.pnl || 0;
      }
    });

    // Determine best and worst times
    const bestEntry = Object.entries(pnlByTimeRange).reduce(
      (a, b) => (b[1] > a[1] ? b : a),
      ["Not available", 0]
    );

    const worstEntry = Object.entries(pnlByTimeRange).reduce(
      (a, b) => (b[1] < a[1] ? b : a),
      ["Not available", 0]
    );

    let bestTime = "Not available";
    let worstTime = "Not available";

    if (bestEntry[1] > 0) bestTime = bestEntry[0];
    if (worstEntry[1] < 0) worstTime = worstEntry[0];

    const winRatio = totalTrades > 0 ? (winTrades / totalTrades) * 100 : 0;
    const averagePnL = totalTrades > 0 ? netPnL / totalTrades : 0;

    const totalVolume = accountTrades.reduce(
      (sum, trade) => sum + (trade.totalQuantity || 0),
      0
    );

    // daily aggregations
    const dailyPnL = {};
    const dailyVolume = {};

    accountTrades.forEach((trade) => {
      const date = new Date(
        trade.closeTime || trade.openTime
      ).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      dailyPnL[date] = (dailyPnL[date] || 0) + (trade.pnl || 0);

      const qty = trade.totalQuantity || 0;
      if (!dailyVolume[date]) {
        dailyVolume[date] = { longVolume: 0, shortVolume: 0 };
      }

      if (trade.direction?.toLowerCase() === "long") {
        dailyVolume[date].longVolume += qty;
      } else if (trade.direction?.toLowerCase() === "short") {
        dailyVolume[date].shortVolume += qty;
      }
    });

    const dailyData = Object.entries(dailyPnL)
      .map(([date, pnl]) => ({ date, pnl }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const dailyVolumeData = Object.entries(dailyVolume)
      .map(([date, { longVolume, shortVolume }]) => ({
        date,
        longVolume,
        shortVolume,
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    let gfIndex = 50;
    last10.forEach((trade) => {
      if (trade.pnl > 0) gfIndex += 5;
      else if (trade.pnl < 0) gfIndex -= 5;
    });
    gfIndex = Math.max(0, Math.min(100, gfIndex));
    const gfLabel = gfIndex < 50 ? "Fear" : gfIndex > 50 ? "Greed" : "Neutral";

    // For reasons

    // 🔹 Tag/Reason Analysis
    const tagAnalysis = {};

    accountTrades.forEach((trade) => {
      const reasons = trade.reason || [];
      const pnl = trade.pnl || 0;
      const isWin = pnl > 0;
      const isLoss = pnl < 0;

      reasons.forEach((reason) => {
        if (!tagAnalysis[reason]) {
          tagAnalysis[reason] = {
            tag: reason,
            totalTrades: 0,
            winTrades: 0,
            loseTrades: 0,
            totalPnL: 0,
            avgPnL: 0,
            winRate: 0,
          };
        }

        tagAnalysis[reason].totalTrades++;
        tagAnalysis[reason].totalPnL += pnl;

        if (isWin) tagAnalysis[reason].winTrades++;
        if (isLoss) tagAnalysis[reason].loseTrades++;
      });
    });

    // Calculate derived metrics for each tag
    Object.values(tagAnalysis).forEach((tag) => {
      tag.avgPnL = tag.totalTrades > 0 ? tag.totalPnL / tag.totalTrades : 0;
      tag.winRate =
        tag.totalTrades > 0 ? (tag.winTrades / tag.totalTrades) * 100 : 0;
    });

    // Sort tags by total PnL (most profitable first)
    const sortedTagAnalysis = Object.values(tagAnalysis).sort(
      (a, b) => b.totalPnL - a.totalPnL
    );

    setStats({
      netPnL,
      maxProfit,
      maxLoss,
      totalTrades,
      streak: `${streakCount} ${streakType || ""}`,
      totalSymbols: uniqueSymbols,
      winTrades,
      loseTrades,
      dailyData,
      dailyVolumeData,
      last10,
      greedFear: { value: gfIndex, label: gfLabel },
      bestTime,
      worstTime,
      winRatio: winRatio.toFixed(2),
      averagePnL: averagePnL.toFixed(2),
      totalVolume,
      totalFees,
      tagAnalysis: sortedTagAnalysis,
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
      {activeTab === "longshorts" && (
        <LongShorts
          stats={stats}
          longTrades={trades.filter((t) => t.direction === "long")}
          shortTrades={trades.filter((t) => t.direction === "short")}
        />
      )}

      {activeTab === "ticker" && <TickerAnalysis trades={trades} />}
      {activeTab === "news" && <MarketNews />}

      <BackgroundBlur />
    </div>
  );
}
