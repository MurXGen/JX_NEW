"use client";

import { childVariants, containerVariants } from "@/animations/motionVariants";
import GoogleBannerAd from "@/components/ads/GoogleBannerAd";
import Navbar from "@/components/Trades/Navbar";
import BackgroundBlur from "@/components/ui/BackgroundBlur";
import MessageCard from "@/components/ui/BannerInstruction";
import BeginnerGuide from "@/components/ui/BeginnerGuide";
import FullPageLoader from "@/components/ui/FullPageLoader";
import SectionHeader from "@/components/ui/SectionHeader";
import { formatCurrency } from "@/utils/formatNumbers";
import { getFromIndexedDB, saveToIndexedDB } from "@/utils/indexedDB";
import { getPlanRules } from "@/utils/planRestrictions";
import { fetchAccountsAndTrades } from "@/utils/fetchAccountAndTrades"; // Your new utility
import axios from "axios";
import { motion, Reorder } from "framer-motion";
import Cookies from "js-cookie";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Crown,
  Plus,
  Share2,
  TrendingUp,
  Upload,
  GripVertical,
  User,
  User2,
  Settings,
  PieChart,
} from "lucide-react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FiDatabase } from "react-icons/fi";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

function Accounts() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [accountSymbols, setAccountSymbols] = useState({});
  const [currentBalances, setCurrentBalances] = useState({});
  const [tradesCount, setTradesCount] = useState({});
  const [showAllAccounts, setShowAllAccounts] = useState(false);
  const [userPlan, setUserPlan] = useState(null);
  const [planUsage, setPlanUsage] = useState({});
  const [showMore, setShowMore] = useState(false);
  const [orderedAccounts, setOrderedAccounts] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [apiCallFailed, setApiCallFailed] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);
      setApiCallFailed(false);

      try {
        // 1️⃣ Try to fetch fresh data from backend first (this is the primary source)
        const res = await axios.get(`${API_BASE}/api/auth/user-info`, {
          withCredentials: true,
        });

        const { userData } = res.data;

        // 2️⃣ Store in IndexedDB for future offline usage
        if (userData) {
          await saveToIndexedDB("user-data", userData);
          if (userData?.plans) await saveToIndexedDB("plans", userData.plans);
          if (userData?.name) localStorage.setItem("userName", userData.name);
        }

        // 3️⃣ Process with your existing utility
        const result = await fetchAccountsAndTrades();

        if (result.redirectToLogin) {
          router.push("/login");
          return;
        }

        // 4️⃣ Update state with fresh data
        setAccounts(result.accounts);
        setAccountSymbols(result.accountSymbols);
        setCurrentBalances(result.currentBalances);
        setTradesCount(result.tradesCount);
        setUserPlan(result.userPlan);

        // Calculate plan usage
        if (result.userPlan) {
          const cachedUser = await getFromIndexedDB("user-data");
          if (cachedUser) {
            const planRules = getPlanRules(cachedUser);
            const currentUsage = calculatePlanUsage(cachedUser, planRules);
            setPlanUsage(currentUsage);
          }
        }
      } catch (error) {
        console.error("API call failed, falling back to cached data:", error);
        setApiCallFailed(true);

        // 5️⃣ Only fallback to IndexedDB if API fails
        try {
          const cached = await getFromIndexedDB("user-data");

          if (cached) {
            // Process cached data
            const result = await fetchAccountsAndTrades();

            setAccounts(result.accounts);
            setAccountSymbols(result.accountSymbols);
            setCurrentBalances(result.currentBalances);
            setTradesCount(result.tradesCount);
            setUserPlan(result.userPlan);

            // Show a toast or notification that you're using cached data
            // You can add a toast message here if you have a toast system
            console.log("Using cached data - API unavailable");
          } else {
            // No cached data available
            if (error.response?.status === 429) {
              // Rate limited - show appropriate message
              console.warn("Rate limit reached. Please try again later.");
            } else {
              router.push("/login");
            }
          }
        } catch (cacheError) {
          console.error("Failed to load cached data:", cacheError);
          router.push("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [router]);

  // URL verification effect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isVerified = params.get("isVerified");

    if (isVerified === "yes") {
      Cookies.set("isVerified", "yes", {
        path: "/",
        sameSite: "Strict",
        expires: 365000,
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Guide effect
  useEffect(() => {
    const guideFlag = localStorage.getItem("guide");
    if (guideFlag === "yes") {
      setShowGuide(true);
    }
  }, []);

  const handleCloseGuide = () => {
    setShowGuide(false);
    localStorage.removeItem("guide");
  };

  // Account ordering effects
  useEffect(() => {
    const savedOrder = JSON.parse(localStorage.getItem("accountOrder") || "[]");
    if (savedOrder.length && accounts.length) {
      const mapById = new Map(accounts.map((a) => [a._id, a]));
      const reordered = savedOrder.map((id) => mapById.get(id)).filter(Boolean);
      const missing = accounts.filter((a) => !savedOrder.includes(a._id));
      setOrderedAccounts([...reordered, ...missing]);
    } else {
      setOrderedAccounts(accounts);
    }
  }, [accounts]);

  useEffect(() => {
    if (orderedAccounts.length > 0) {
      const order = orderedAccounts.map((acc) => acc._id);
      localStorage.setItem("accountOrder", JSON.stringify(order));
    }
  }, [orderedAccounts]);

  const displayedAccounts = showAllAccounts
    ? orderedAccounts
    : orderedAccounts.slice(0, 2);

  const handleReorderVisible = (newVisibleOrder) => {
    if (showAllAccounts) {
      setOrderedAccounts(newVisibleOrder);
      return;
    }

    const rest = orderedAccounts.slice(newVisibleOrder.length);
    const merged = [...newVisibleOrder, ...rest];

    const seen = new Set();
    const deduped = [];
    for (const item of merged) {
      const id = item._id ?? item;
      const key = typeof id === "string" ? id : JSON.stringify(item);
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(item);
      }
    }

    setOrderedAccounts(deduped);
  };

  const calculatePlanUsage = (userData, planRules) => {
    const accountsCount = userData.accounts?.length || 0;
    const tradesCount = userData.trades?.length || 0;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthlyTrades =
      userData.trades?.filter((trade) => {
        const tradeDate = new Date(trade.openTime);
        return (
          tradeDate.getMonth() === currentMonth &&
          tradeDate.getFullYear() === currentYear
        );
      }).length || 0;

    const monthlyImages =
      userData.trades?.reduce((count, trade) => {
        const tradeDate = new Date(trade.openTime);
        if (
          tradeDate.getMonth() === currentMonth &&
          tradeDate.getFullYear() === currentYear
        ) {
          if (trade.openImageUrl) count++;
          if (trade.closeImageUrl) count++;
        }
        return count;
      }, 0) || 0;

    const formatLimit = (value) => (value === Infinity ? "Unlimited" : value);

    const calcPercentage = (current, limit) =>
      limit === Infinity ? 100 : Math.min((current / limit) * 100, 100);

    return {
      accounts: {
        current: accountsCount,
        limit: formatLimit(planRules.accountLimit),
        percentage: calcPercentage(accountsCount, planRules.accountLimit),
      },
      trades: {
        current: monthlyTrades,
        limit: formatLimit(planRules.tradeLimitPerMonth),
        percentage: calcPercentage(monthlyTrades, planRules.tradeLimitPerMonth),
      },
      images: {
        current: monthlyImages,
        limit: formatLimit(planRules.imageLimitPerMonth),
        percentage: calcPercentage(monthlyImages, planRules.imageLimitPerMonth),
      },
    };
  };

  const handleAccountClick = (accountId) => {
    try {
      Cookies.set("accountId", accountId, {
        path: "/",
        sameSite: "Strict",
        expires: 365,
      });
      router.push("/dashboard");
    } catch (err) {
      console.error("Error setting account cookie:", err);
    }
  };

  const handleCreateAccount = async () => {
    setLoading(true);
    router.push("/create-account");
  };

  const quickActions = [
    {
      id: "upgrade-plan",
      title: "Upgrade plan limit",
      description: "Unlock more features and higher limits",
      icon: Crown,
      path: "/pricing",
      enabled: true,
    },
    {
      id: "export",
      title: "Export journal",
      description: "Backup or migrate your trading data",
      icon: Upload,
      path: "/export",
      enabled: true,
    },
    {
      id: "share-trades",
      title: "Share journal",
      description: "Share your trading performance",
      icon: Share2,
      path: "/share-trades",
      enabled: true,
    },
    {
      id: "market-news",
      title: "Events calendar",
      description: "Forex factory's market updates",
      icon: TrendingUp,
      path: "https://www.forexfactory.com/calendar",
      enabled: true,
    },
  ];

  const handleDragStart = () => setIsDragging(true);
  const handleDragEnd = () => setIsDragging(false);

  if (loading) {
    return <FullPageLoader />;
  }

  return (
    <>
      <Head>
        <title>Accounts | JournalX</title>
        <meta
          name="description"
          content="Manage your JournalX trading accounts. Add, view, and analyze your performance across multiple portfolios in one place."
        />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="JournalX" />
        <meta property="og:title" content="Accounts | JournalX" />
        <meta
          property="og:description"
          content="Access and manage all your JournalX accounts with a unified dashboard."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://journalx.app/accounts" />
        <meta property="og:image" content="/assets/Journalx_Banner.png" />
        <link rel="canonical" href="https://journalx.app/accounts" />
      </Head>

      <div
        className="flexClm gap_24 dashboard"
        style={{
          maxWidth: "1200px",
          minWidth: "300px",
          margin: "0px auto",
          padding: "16px 16px 100px 16px",
          height: "100vh",
        }}
      >
        {/* <Navbar /> */}

        <div className="flexRow flexRow_stretch">
          <div className="flexRow gap_12">
            {/* <div
              className="boxBg"
              style={{ padding: "12px 16px", cursor: "pointer" }}
              onClick={() => router.push("/profile")}
            >
              <User2 size={16} />
            </div> */}
            <div className="flexClm">
              <span className="font_20">Journals</span>
            </div>
          </div>

          <div className="flexRow gap_8">
            {orderedAccounts.length !== 0 && (
              <button
                className="btn flexRow gap_4"
                style={{ padding: "12px 16px", cursor: "pointer" }}
                onClick={() => router.push("/create-account")}
              >
                <Plus size={16} />
                <span className="font_14">Create journal</span>
              </button>
            )}

            <button
              className="btn flexRow gap_4"
              style={{ padding: "12px 16px", cursor: "pointer" }}
              onClick={() => router.push("/profile")}
            >
              <User size={18} />
            </button>
          </div>
        </div>

        {/* Accounts List */}
        <div className="flexClm gap_12">
          {loading ? (
            <div className="flexRow flex_center">
              <div className="spinner"></div>
            </div>
          ) : (
            <>
              <div
                className="accountsList flexClm gap_16"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                {orderedAccounts.length === 0 ? (
                  <div
                    className="flexClm flex_center"
                    style={{
                      minHeight: "80vh",
                      padding: "24px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      className="flexClm gap_20 flex_center"
                      style={{
                        maxWidth: "420px",
                        width: "100%",
                      }}
                    >
                      {/* GIF */}
                      <img
                        src="/assets/no-data.gif"
                        alt="No Journal Found"
                        width={200}
                        height={200}
                        style={{ objectFit: "contain" }}
                      />

                      {/* Heading */}
                      <span className="font_20 font_weight_600">
                        No Journal Found
                      </span>

                      {/* Description */}
                      <span className="font_14 shade_70">
                        You haven’t created any trading journals yet.
                      </span>

                      <div className="flexClm gap_6 font_14 shade_60">
                        <span>Create your first journal to start</span>
                        <span>tracking and analyzing your trades.</span>
                      </div>

                      {/* Create Button */}
                      <div style={{ marginTop: "24px" }}>
                        <button
                          className="primary-btn flexRow flex_center gap_8"
                          onClick={() => router.push("/create-account")}
                        >
                          Create First Journal
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Draggable Accounts List */}
                    <Reorder.Group
                      as="div"
                      axis="y"
                      values={displayedAccounts} // <- use the rendered list
                      onReorder={handleReorderVisible} // <- merge back to full order
                      className="flexClm gap_16"
                    >
                      {displayedAccounts.map((acc) => {
                        const lastTradedAccountId = Cookies.get("accountId");
                        const isLastTraded = acc._id === lastTradedAccountId;

                        return (
                          <Reorder.Item
                            as="div"
                            key={acc._id}
                            value={acc}
                            className="accountCardWrapper"
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                          >
                            <div
                              className={`stats-card flexClm gap_24 radius-12 ${
                                isDragging ? "dragging" : ""
                              } ${isLastTraded ? "lastTraded" : ""}`}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              layout
                            >
                              <div className="flexRow flexRow_stretch spaceBetween">
                                <div className="flexClm">
                                  <div className="flexRow gap_8">
                                    <span className="font_16 font_weight_600">
                                      {acc.name}
                                    </span>
                                  </div>
                                  <div className="flexRow gap_12 margin_top_4">
                                    <span className="font_14">
                                      {tradesCount[acc.name] ?? 0} trades
                                    </span>
                                    {isLastTraded && (
                                      <span className="font_14 success">
                                        Active
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flexRow gap_8 flex_center">
                                  {/* Drag Handle */}
                                  <div
                                    className="dragHandle flexRow flex_center"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    title="Drag to reorder"
                                  >
                                    <GripVertical
                                      size={16}
                                      className="shade_50"
                                    />
                                  </div>

                                  <ArrowRight
                                    size={18}
                                    className="vector cursor_pointer"
                                    onClick={() => handleAccountClick(acc._id)}
                                  />
                                </div>
                              </div>
                              <div className="flexRow gap_12">
                                <button
                                  className="primary-btn secondary-btn width100 flexRow flex_center gap_12"
                                  onClick={() => handleAccountClick(acc._id)}
                                >
                                  <PieChart size={16} /> Dashboard
                                </button>
                                <button
                                  className="primary-btn secondary-btn width100 flexRow flex_center gap_12"
                                  onClick={() =>
                                    router.push("/journal-setting")
                                  }
                                >
                                  <Settings size={16} /> Setting
                                </button>
                              </div>
                            </div>
                          </Reorder.Item>
                        );
                      })}
                    </Reorder.Group>

                    {/* Show More/Less Button */}
                    {orderedAccounts.length > 2 && (
                      <button
                        className="btn flexRow gap_8 flex_center"
                        onClick={() => setShowAllAccounts(!showAllAccounts)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        {showAllAccounts ? (
                          <>
                            <ChevronUp size={16} />
                            <span>Show Less</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown size={16} />
                            <span>
                              Show {orderedAccounts.length - 2} more journals
                            </span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Drag Hint */}
                    {orderedAccounts.length > 1 && (
                      <div
                        className="dragHint flexRow gap_8 flex_center font_12 shade_50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                      >
                        <GripVertical size={12} />
                        <span className="font_14">
                          Drag to reorder journals
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {showGuide && <BeginnerGuide onClose={handleCloseGuide} />}
        <GoogleBannerAd />
      </div>

      {loading ? (
        <div
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <FullPageLoader />
        </div>
      ) : (
        <div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="dashboard-page">{/* content here */}</div>
        </div>
      )}
    </>
  );
}

export default Accounts;
