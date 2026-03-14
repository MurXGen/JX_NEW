"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowRightLeft,
  ChevronLeft,
  Crown,
  Home as HomeIcon,
  LucideSettings,
  Menu,
  Newspaper,
  PlusCircle,
  Share,
  Share2Icon,
  TrendingUp as TrendingUpIcon,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import AccountSwitchModal from "@/components/dashboard/AccountSwitchModal";
import ExportPage from "@/components/dashboard/ExportModal";
import HomeContent from "@/components/dashboard/HomeDashboard";
import JournalSetting from "@/components/dashboard/JournalSetting";
import Pricing from "@/components/dashboard/PricingModal";
import ShareTrades from "@/components/dashboard/ShareModal";
import FullPageLoader from "@/components/ui/FullPageLoader";
import TradesWebPage from "@/components/dashboard/TradesPage";
import AddTradeWebPage from "@/components/dashboard/AddTradeModal";
import EventsWebPage from "@/components/dashboard/HeatMap";
import ProfileWeb from "@/components/dashboard/ProfileWeb";
import { useData } from "@/api/DataContext";

export default function Dashboard1() {
  const [open, setOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("home");
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  // Get all data from context
  const {
    loading,
    userData,
    accounts,
    accountTrades,
    currentBalances,
    accountSymbols,
    currentAccount,
    isProMonthly,
  } = useData();

  const menuItems = [
    { id: "home", icon: <HomeIcon size={20} />, label: "Home" },
    { id: "trades", icon: <TrendingUpIcon size={20} />, label: "History" },
    { id: "heatmaps", icon: <Newspaper size={20} />, label: "Heatmap & News" },
    { id: "share", icon: <Share2Icon size={20} />, label: "Share logs" },
    { id: "export", icon: <Share size={20} />, label: "Export logs" },
    {
      id: "accountSetting",
      icon: <LucideSettings size={20} />,
      label: "Journal setting",
    },
  ];

  useEffect(() => {
    if (typeof window !== "undefined") {
      const checkWidth = () => {
        if (window.innerWidth < 600) {
          router.replace("/dashboard");
        }
      };

      checkWidth();
      window.addEventListener("resize", checkWidth);

      return () => window.removeEventListener("resize", checkWidth);
    }
  }, [router]);

  if (loading) {
    return <FullPageLoader />;
  }

  return (
    <div>
      <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        {/* SIDEBAR */}
        <motion.div
          animate={{ width: open ? 320 : 65 }}
          transition={{ duration: 0.25 }}
          className="sidebarContainer"
          style={{
            position: "relative",
            background: "var(--white)",
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRight: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* 🔵 TOP SECTION */}
          <div
            style={{
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: open ? "space-between" : "center",
            }}
          >
            {open && (
              <div className="flexRow flexRow_stretch width100 ">
                <span className="font_24 font_weight_600 black-text flexRow gap_4">
                  JOURNAL
                  <strong
                    className="font_32"
                    style={{ color: "var(--primary)" }}
                  >
                    X
                  </strong>
                </span>
                <ChevronLeft
                  size={22}
                  className="sideBar_clickables"
                  style={{ cursor: "pointer", color: "var(--black)" }}
                  onClick={() => setOpen(!open)}
                />
              </div>
            )}

            {!open && (
              <div className="flexClm gap_8" style={{ alignItems: "center" }}>
                <Menu
                  size={22}
                  className="sideBar_clickables"
                  style={{ cursor: "pointer" }}
                  onClick={() => setOpen(!open)}
                />
              </div>
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
            {/* SELECT ACCOUNT */}
            {open ? (
              <div
                className="flexRow gap_4 boxBg flexRow_stretch sideBar_clickables"
                style={{ cursor: "pointer", padding: "12px 14px" }}
                onClick={() => setShowModal(true)}
              >
                <div className="flexClm gap_4">
                  <span className="font_14 black_text">Journals</span>
                  <span className="font_14 font_weight_600">
                    {currentAccount?.name || "Select Account"}
                  </span>
                </div>

                <ArrowRightLeft size={18} className="vector" />
              </div>
            ) : (
              <div
                className="flexRow gap_4 flexRow_stretch sideBar_clickables"
                style={{ cursor: "pointer", padding: "12px 14px" }}
                onClick={() => setShowModal(true)}
              >
                <ArrowRightLeft size={18} className="vector" />
              </div>
            )}

            {/* LOG TRADE */}
            {open ? (
              <div
                className="flexRow gap_4 flexRow_stretch sideBar_clickables primary-btn font_weight_600"
                style={{
                  cursor: "pointer",
                }}
                onClick={() => setActiveTab("logtrade")}
              >
                <span className="font_12">Log a Trade</span>
                <ArrowRight size={18} />
              </div>
            ) : (
              <div
                className="flexRow gap_4 flexRow_stretch sideBar_clickables"
                style={{ cursor: "pointer", padding: "12px 14px" }}
                onClick={() => setActiveTab("logtrade")}
              >
                <PlusCircle size={18} className="vector" />
              </div>
            )}

            <hr width={100} color="grey" />

            {menuItems.map((item) => {
              const isActive = activeTab === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`sidebarItem ${isActive ? "active" : ""}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 14px",
                    cursor: "pointer",
                    borderRadius: "10px",
                    transition: "all 0.2s ease",
                    color: "var(--black)",
                  }}
                >
                  <div className="vector flexRow">{item.icon}</div>

                  {open && <span className="font_14">{item.label}</span>}
                </div>
              );
            })}
          </div>

          {/* 🔵 BOTTOM SECTION */}
          <div
            style={{
              padding: "10px 8px",
              borderTop: "1px solid rgba(0,0,0,0.5)",
            }}
          >
            {/* 🔸 SHOW UPGRADE BUTTON ONLY IF USER IS ON PRO MONTHLY */}
            {!isProMonthly && (
              <>
                {open && (
                  <button
                    className="upgrade_btn flexRow flexRow_stretch sideBar_clickables"
                    onClick={() => setActiveTab("pricingpage")}
                  >
                    Upgrade Plan <Crown size={18} />
                  </button>
                )}

                {!open && (
                  <button
                    className="flexRow flexRow_stretch sideBar_clickables"
                    onClick={() => setActiveTab("pricingpage")}
                    style={{
                      background: "none",
                      border: "none",
                      padding: "12px 14px",
                    }}
                  >
                    <Crown size={20} className="vector" />
                  </button>
                )}
              </>
            )}

            {/* 👤 PROFILE CARD */}
            {open && (
              <div
                className="sideBar_clickables"
                style={{
                  marginTop: "16px",
                  padding: "12px",
                  borderRadius: "12px",
                  display: "flex",
                  gap: "12px",
                  alignItems: "center",
                  cursor: "pointer",
                  background: "var(--black-10)",
                }}
                onClick={() => setActiveTab("profile")}
              >
                <div>
                  <User size={24} style={{ color: "var(--black)" }} />
                </div>

                <div className="flexClm">
                  <span className="font_14 font_weight_600">
                    {userData?.name || "User"}
                  </span>
                  <span className="font_12 black-text">
                    {userData?.email || "user@example.com"}
                  </span>
                </div>
              </div>
            )}

            {/* Mini Profile (collapsed) */}
            {!open && userData && (
              <div
                className="sideBar_clickables"
                style={{
                  marginTop: "16px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "4px",
                  cursor: "pointer",
                }}
                onClick={() => setActiveTab("profile")}
                title={`${userData.name || "User"}\n${userData.email || "user@example.com"}`}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.2)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <User size={24} />
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* RIGHT CONTENT */}
        <div
          className="stats-card"
          style={{
            flex: 1,
            padding: "24px",
            overflowY: "auto",
            borderRadius: "12px",
            margin: "12px",
            background: "var(--mobile-bg)",
            padding: "0",
          }}
        >
          {activeTab === "home" && <HomeContent />}

          {activeTab === "trades" && <TradesWebPage trades={accountTrades} />}

          {activeTab === "logtrade" && <AddTradeWebPage />}

          {activeTab === "heatmaps" && <EventsWebPage />}

          {activeTab === "export" && <ExportPage />}

          {activeTab === "share" && <ShareTrades />}

          {activeTab === "pricingpage" && <Pricing />}

          {activeTab === "accountSetting" && <JournalSetting />}

          {activeTab === "profile" && <ProfileWeb />}
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
