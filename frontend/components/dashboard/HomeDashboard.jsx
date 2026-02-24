"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchAccountsAndTrades } from "@/utils/fetchAccountAndTrades";
import { calculateStats } from "@/utils/calculateStats";
import {
  ArrowUpRight,
  ChevronDown,
  Circle,
  Menu,
  MenuIcon,
  PieChart,
  Settings,
  Smile,
  SwitchCamera,
  SwitchCameraIcon,
  TrendingDown,
  TrendingUp,
  User,
} from "lucide-react";
import HeroCards from "@/components/dashboardMobile/HeroCards";
import { getCurrencySymbol } from "@/utils/currencySymbol";
import Cookies from "js-cookie";
import AllTradeStats from "@/components/dashboardMobile/AllTradesStats";
import AllLongShortStats from "@/components/dashboardMobile/AllLongShortStats";
import AllTickerStats from "@/components/dashboardMobile/AllTickerStats";
import DailyPnlChart from "@/components/Charts/DailyPnlChart";
import { processPnLCandles } from "@/utils/processPnLCandles";
import PnLAreaChart from "@/components/Charts/PnLAreaChart";
import PNLChart from "@/components/Charts/PnlChart";
import TagAnalysis from "@/components/Charts/TagAnalysis";
import TagPerformance from "@/components/Charts/TagPerformance";
import LongShortVolumes from "@/components/Charts/LongShortVolumes";
import VolumeChart from "@/components/Charts/AllVolume";
import TickerAnalysis from "@/components/Tabs/TickerAnalysis";
import BottomBar from "@/components/Trades/BottomBar";
import { useRouter } from "next/navigation";
import { FcSwitchCamera } from "react-icons/fc";

export default function DashboardMobile() {
  const router = useRouter();
  const [accounts, setAccounts] = useState([]);
  const [trades, setTrades] = useState([]);
  const [userPlan, setUserPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("Overview");
  const tabs = ["Overview", "Buy/sell", "Ticker"];

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

  const candleData = processPnLCandles(trades);

  const handleEdit = () => {
    router.push("/create-account?mode=edit");
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <div className="flexClm dashboard pad_16 gap_32">
        {/* <div className="mob-header flexRow flexRow_stretch">
          <button className="btn" onClick={() => router.push("/accounts")}>
            <MenuIcon size={24} />
          </button>

          <div className="flexClm flex_center">
            <span className="font_16 font_weight_600">
              {selectedAccount && <span>{selectedAccount.name}</span>}
            </span>
            <span className="font_14" style={{ color: "var(--black-50)" }}>
              Journal Dashboard
            </span>
          </div>
          <button
            className="btn"
            onClick={() => router.push("/journal-setting")}
          >
            <Settings size={24} />
          </button>
        </div> */}

        {/* Stats */}
        <HeroCards
          balance={totalBalance}
          netPnL={stats.netPnL}
          winTrades={stats.winTrades}
          loseTrades={stats.loseTrades}
          maxProfit={stats.maxProfit}
          maxLoss={stats.maxLoss}
          currencySymbol={currencySymbol}
        />

        {/* Tabs */}
        <div className="mobile-tabs">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`tab-item ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <BottomBar />

        {activeTab === "Overview" && (
          <>
            <AllTradeStats
              stats={stats}
              trades={selectedTrades}
              currencySymbol={currencySymbol}
            />

            <div className="">
              <TagPerformance
                tagAnalysis={stats.tagAnalysis}
                currencySymbol={currencySymbol}
              />
            </div>
            <div className="">
              <PNLChart dailyData={stats.dailyData} />
            </div>
            <div className="">
              <DailyPnlChart data={candleData} />
            </div>
            <div className="">
              <PnLAreaChart data={candleData} />
            </div>

            <div className="">
              <VolumeChart dailyData={stats.dailyVolumeData} />
            </div>
          </>
        )}

        {activeTab === "Buy/sell" && (
          <>
            <AllLongShortStats
              trades={selectedTrades}
              currencySymbol={currencySymbol}
            />
            <div className="">
              <LongShortVolumes dailyData={stats.dailyVolumeData} />
            </div>
          </>
        )}

        {activeTab === "Ticker" && (
          <>
            <AllTickerStats trades={trades} currencySymbol={currencySymbol} />
            <div className="">
              <TickerAnalysis trades={trades} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
