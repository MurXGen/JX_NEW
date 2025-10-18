"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Head from "next/head";
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
import { calculateStats } from "@/utils/calculateStats";

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
      } else {
        setLoading(false); // account exists, stop loader
      }

      const userData = await getFromIndexedDB("user-data");

      if (userData) {
        const account = (userData.accounts || []).find(
          (acc) => acc._id === accountId
        );
        if (account?.currency) {
          localStorage.setItem("currencyCode", account.currency);
        }

        const accountTrades = (userData.trades || []).filter(
          (trade) => trade.accountId === accountId
        );
        setTrades(accountTrades);

        const computedStats = calculateStats(accountTrades);
        setStats(computedStats);

        if (accountTrades.length > 0) {
          const currencyFromLS = localStorage.getItem("currencyCode");
          calculateStats(accountTrades, currencyFromLS);
        }
      }

      setLoading(false);
    };

    loadTrades();
  }, [router]);

  if (loading) {
    return <FullPageLoader />;
  }

  return (
    <>
      <Head>
        <title>JournalX — Trading Journal & Analytics Tool</title>
        <meta
          name="description"
          content="JournalX is a free-to-start trading journal for traders. Log trades, get AI-powered insights, analyze performance, and improve your strategies."
        />
        <meta
          name="keywords"
          content="trading journal, trading analytics, AI trade analysis, trade journal app, free trading journal, journal for traders"
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://journalx.app/" />
      </Head>

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
    </>
  );
}
