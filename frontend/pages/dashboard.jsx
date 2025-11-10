"use client";

import LongShorts from "@/components/Tabs/Long_short";
import MarketNews from "@/components/Tabs/HeatMaps";
import Overview from "@/components/Tabs/Overview";
import TickerOverview from "@/components/Tabs/Tickeroverview";
import TickerAnalysis from "@/components/Tabs/Tickeroverview";
import BottomBar from "@/components/Trades/BottomBar";
import Navbar from "@/components/Trades/Navbar";
import BackgroundBlur from "@/components/ui/BackgroundBlur";
import FullPageLoader from "@/components/ui/FullPageLoader";
import { calculateStats } from "@/utils/calculateStats";
import { getFromIndexedDB } from "@/utils/indexedDB";
import Cookies from "js-cookie";
import { X } from "lucide-react";
import Head from "next/head";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const dismissed =
      localStorage.getItem("journalx_install_dismissed") === "true";

    const isInstalled =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone ||
      localStorage.getItem("journalx_installed") === "true" ||
      dismissed;

    if (isInstalled) return;

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () =>
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === "accepted") {
      localStorage.setItem("journalx_installed", "true");
    }

    setShowPrompt(false);
    setDeferredPrompt(null);
  };

  return { showPrompt, handleInstall, setShowPrompt };
}

export default function Home() {
  const router = useRouter();
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const { showPrompt, setShowPrompt, handleInstall } = useInstallPrompt();

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
        <title>JournalX | Trading Journal Dashboard</title>
        <meta
          name="description"
          content="JournalX is your personal trading journal dashboard to track trades, analyze performance, and discover what works best in your trading strategy. Empower your trading with AI insights and analytics."
        />
        <meta
          name="keywords"
          content="trading journal, trade analytics, trading performance tracker, AI trading insights, forex journal, stock trading journal, crypto trading analysis, journalx dashboard, trading performance improvement"
        />
        <meta name="robots" content="index, follow" />

        {/* Open Graph / Social Meta Tags */}
        <meta
          property="og:title"
          content="JournalX | Trading Journal Dashboard"
        />
        <meta
          property="og:description"
          content="Track your trades, visualize your performance, and get AI-driven insights — all in one smart dashboard with JournalX."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://journalx.app/" />
        <meta property="og:image" content="/assets/Journalx_Banner.png" />

        {/* Twitter Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="JournalX | Trading Journal Dashboard"
        />
        <meta
          name="twitter:description"
          content="Simplify your trading journal. JournalX helps you track, analyze, and improve your trading performance with AI insights."
        />
        <meta name="twitter:image" content="/assets/Journalx_Banner.png" />
      </Head>

      <div className="flexClm gap_32" style={{ width: "100%" }}>
        <Navbar />
        {showPrompt && (
          <div
            className="flexClm chart_boxBg gap_12 installPromptBox"
            style={{
              padding: "16px",
              position: "fixed",
              zIndex: 10000,
            }}
          >
            <div className="flexRow flexRow_stretch gap_24">
              <span className="flexClm gap_4">
                <span className="vector font_14">JournalX App</span>
                <span className="font_12 shade_50">
                  Install JournalX for a better experience!
                </span>
              </span>
              <div className="flexRow gap_12">
                <button
                  className="button_pri"
                  style={{ width: "100px" }}
                  onClick={handleInstall}
                >
                  Install App
                </button>
                {/* Close button */}
                <button
                  onClick={() => {
                    setShowPrompt(false);
                    localStorage.setItem("journalx_install_dismissed", "true"); // mark as dismissed
                  }}
                  className="button_sec flexRow flex_center"
                  style={{
                    position: "absolute",
                    top: "-10px",
                    right: "-10px",
                    padding: "8px",
                    borderRadius: "24px",
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div
          className="flexRow gap_12 removeScrollBar"
          style={{ overflowX: "scroll" }}
        >
          {[
            { key: "overview", label: "Overview" },
            { key: "longshorts", label: "Long/Shorts" },
            { key: "ticker", label: "Ticker Analysis" },
            { key: "news", label: "Heatmaps" },
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
        {activeTab === "ticker" && <TickerOverview trades={trades} />}
        {activeTab === "news" && <MarketNews />}

        <BackgroundBlur />
      </div>
    </>
  );
}
