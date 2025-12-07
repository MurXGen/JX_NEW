"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Home as HomeIcon,
  TrendingUp as TrendingUpIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  ArrowRightLeft,
  PlusCircle,
} from "lucide-react";

import { calculateStats } from "@/utils/calculateStats";
import { fetchAccountsAndTrades } from "@/utils/fetchAccountAndTrades";
import { processPnLCandles } from "@/utils/processPnLCandles";
import HomeContent from "@/components/dashboard/HomeDashboard";
import TradePage from "@/components/dashboard/TradesPage";
import Settings from "./settings";
import Cookies from "js-cookie";
import AccountSwitchModal from "@/components/dashboard/AccountSwitchModal";
import AddTrade from "@/components/dashboard/AddTradeModal";

function TradesCard({ title, total, wins, losses }) {
  const winPercent = total ? (wins / total) * 100 : 0;
  const lossPercent = total ? (losses / total) * 100 : 0;

  return (
    <div
      className="totalTrades flexClm gap_12 chart_boxBg width100"
      style={{ padding: "16px 16px" }}
    >
      <div className="flexRow flexRow_stretch">
        <span className="font_12">{title}</span>
        <span className="font_12">{total ?? 0}</span>
      </div>

      <div className="progress-bar">
        <div className="progress-win" style={{ width: `${winPercent}%` }}></div>
        <div
          className="progress-loss"
          style={{ width: `${lossPercent}%` }}
        ></div>
      </div>

      <div className="flexRow flexRow_stretch">
        <span className="font_12">Wins: {wins}</span>
        <span className="font_12">Losses: {losses}</span>
      </div>
    </div>
  );
}

export default function Dashboard1() {
  const [open, setOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("home");

  // 🟩 state for trades
  const [accountTrades, setAccountTrades] = useState([]);
  const menuItems = [
    { id: "home", icon: <HomeIcon size={20} />, label: "Home" },
    { id: "trades", icon: <TrendingUpIcon size={20} />, label: "Trades" },
    // { id: "reports", icon: <BarChartIcon size={20} />, label: "Reports" },
    { id: "settings", icon: <SettingsIcon size={20} />, label: "Settings" },
  ];

  // 🟩 fetch trades from IndexedDB via util
  useEffect(() => {
    const loadData = async () => {
      const data = await fetchAccountsAndTrades();
      setAccountTrades(data.trades || []);
    };

    loadData();
  }, []);

  // 🟧 WAIT UNTIL TRADES LOAD
  if (!accountTrades) return null;

  // 🟩 compute stats
  const stats = calculateStats(accountTrades);

  // Build daily pnl array from trades
  const dailyData = accountTrades.map((t) => ({
    date: t.closeTime,
    pnl: Number(t.pnl) || 0,
  }));

  const candleData = processPnLCandles(accountTrades);

  const longTrades = accountTrades.filter(
    (t) => t.direction?.toLowerCase() === "long" && t.closeTime
  ).length;

  const shortTrades = accountTrades.filter(
    (t) => t.direction?.toLowerCase() === "short" && t.closeTime
  ).length;

  const [showModal, setShowModal] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [currentBalances, setCurrentBalances] = useState({});
  const [accountSymbols, setAccountSymbols] = useState({});

  useEffect(() => {
    const loadData = async () => {
      const result = await fetchAccountsAndTrades();

      if (!result.redirectToLogin) {
        setAccounts(result.accounts);
        setCurrentBalances(result.currentBalances);
        setAccountSymbols(result.accountSymbols);
      }
    };

    loadData();
  }, []);

  const selectedAccountId = Cookies.get("accountId");
  const currentAccount =
    accounts.find((a) => a._id === selectedAccountId) || accounts[0];

  return (
    <div>
      <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        {/* SIDEBAR */}
        <motion.div
          animate={{ width: open ? 240 : 65 }}
          transition={{ duration: 0.25 }}
          className="sidebarContainer"
          style={{
            background: "var(--base-bg-dark)",
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRight: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* 🔵 TOP SECTION (LOGO + TOGGLE) */}
          <div
            style={{
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: open ? "space-between" : "center",
            }}
          >
            {open && (
              <div className="flexRow flexRow_stretch width100">
                <Image
                  src="/assets/journalx_navbar.svg"
                  alt="JournalX Logo"
                  width={80}
                  height={32}
                  priority
                />
                <ChevronLeft
                  size={22}
                  color="white"
                  style={{ cursor: "pointer" }}
                  onClick={() => setOpen(!open)}
                />
              </div>
            )}
            {!open && (
              <ChevronRight
                size={22}
                color="white"
                style={{ cursor: "pointer" }}
                onClick={() => setOpen(!open)}
              />
            )}
          </div>

          {/* 🔵 MENU SECTION */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              padding: "10px 8px",
              flex: 1,
            }}
          >
            {open && (
              <div
                className="flexRow gap_4 boxBg flexRow_stretch"
                style={{ cursor: "pointer", padding: "12px 14px" }}
                onClick={() => setShowModal(true)}
              >
                <div className="flexClm gap_4">
                  <span className="font_8">Journals</span>
                  <span className="font_14 font_weight_600">
                    {currentAccount?.name || "Select Account"}
                  </span>
                </div>

                <ArrowRightLeft size={18} className="vector" />
              </div>
            )}

            {!open && (
              <div
                className="flexRow gap_4 flexRow_stretch"
                style={{ cursor: "pointer", padding: "12px 14px" }}
                onClick={() => setShowModal(true)}
              >
                <ArrowRightLeft size={18} className="vector" />
              </div>
            )}

            {open && (
              <div
                className="flexRow gap_4 boxBg flexRow_stretch"
                style={{ cursor: "pointer", padding: "12px 14px" }}
                onClick={() => setActiveTab("logtrade")}
              >
                <span className="font_12">Log Trade</span>

                <PlusCircle size={18} className="vector" />
              </div>
            )}

            {!open && (
              <div
                className="flexRow gap_4 flexRow_stretch"
                style={{ cursor: "pointer", padding: "12px 14px" }}
                onClick={() => setActiveTab("logtrade")}
              >
                <PlusCircle size={18} className="vector" />
              </div>
            )}

            <hr color="gray" height="0.1px" width="100%" />

            {menuItems.map((item) => {
              const isActive = activeTab === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className="sidebarItem"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 14px",
                    cursor: "pointer",
                    borderRadius: "10px",
                    background: isActive
                      ? "rgba(255,255,255,0.10)"
                      : "transparent",
                    transition: "all 0.2s ease",
                    color: "white",
                  }}
                >
                  <div className="vector flexRow">{item.icon}</div>

                  {open && <span className="font_14">{item.label}</span>}
                </div>
              );
            })}
          </div>

          {/* 🔵 BOTTOM: UPGRADE CTA */}
          <div
            style={{
              padding: "16px",
              borderTop: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <button
              className="upgradeBtn"
              style={{
                background: "linear-gradient(90deg,#FFD056,#FFB800)",
                color: "#473100",
                width: "100%",
                padding: "12px 14px",
                borderRadius: "12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontWeight: 600,
                cursor: "pointer",
                border: "none",
              }}
              onClick={() => (window.location.href = "/pricing")}
            >
              {open ? (
                <>
                  Upgrade Plan <ArrowRight size={18} />
                </>
              ) : (
                <ArrowRight size={20} />
              )}
            </button>
          </div>
        </motion.div>

        {/* RIGHT CONTENT */}
        <div
          style={{
            flex: 1,
            padding: "24px",
            overflowY: "auto",
            background: "var(--base-bg)",
          }}
        >
          {activeTab === "home" && (
            <HomeContent
              trades={accountTrades}
              stats={stats}
              accountTrades={accountTrades}
              dailyData={dailyData}
              candleData={candleData}
              longTrades={longTrades}
              shortTrades={shortTrades}
            />
          )}

          {activeTab === "trades" && <TradePage trades={accountTrades} />}

          {activeTab === "logtrade" && <AddTrade />}

          {/* {activeTab === "reports" && <ReportsPage />} */}

          {activeTab === "settings" && <Settings />}
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <AccountSwitchModal
          accounts={accounts}
          currentBalances={currentBalances}
          accountSymbols={accountSymbols}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
