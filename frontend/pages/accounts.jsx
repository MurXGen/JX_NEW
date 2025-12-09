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
} from "lucide-react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
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

  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);

      try {
        // 1️⃣ Fetch fresh data directly from backend
        const res = await axios.get(`${API_BASE}/api/auth/user-info`, {
          withCredentials: true,
        });

        const { userData } = res.data;

        // 2️⃣ Store in IndexedDB for offline usage (only once)
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

        // 4️⃣ Update state
        setAccounts(result.accounts);
        setAccountSymbols(result.accountSymbols);
        setCurrentBalances(result.currentBalances);
        setTradesCount(result.tradesCount);
        setUserPlan(result.userPlan);
      } catch (error) {
        if (error.response?.status === 429) {
          console.warn("Rate limit reached — try again later.");
        } else {
          console.error("Error loading user data:", error);
        }

        // fallback to cached data if available
        const cached = await getFromIndexedDB("user-data");
        if (cached) {
          const result = await fetchAccountsAndTrades();
          setAccounts(result.accounts);
          setUserPlan(result.userPlan);
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

  // User data loading effect - Simplified using utility
  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);

      try {
        // Use your utility function
        const result = await fetchAccountsAndTrades();

        if (result.redirectToLogin) {
          router.push("/login");
          return;
        }

        // Set state from utility result
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
        console.error("Error loading user data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [router]);

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
        className="dashboard flexClm gap_32"
        style={{
          maxWidth: "1200px",
          minWidth: "300px",
          margin: "12px auto",
          padding: "0 12px 100px 12px",
        }}
      >
        {/* <Navbar /> */}
        <BackgroundBlur />

        <SectionHeader
          title="Journals"
          description="Select you journal"
          level={4} // uses <h2>
          showButton={accounts.length > 0}
          buttonLabel="Create journal"
          onButtonClick={handleCreateAccount}
          loading={loading}
        />

        {/* Accounts List */}
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
                  className="notFound flexClm gap_16 flex_center"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <FiDatabase size={48} className="vector" />
                  <div className="flexClm gap_8 flex_Center">
                    <span
                      className="font_16 font_weight_600"
                      style={{ textAlign: "center" }}
                    >
                      No journal found
                    </span>
                    <span className="font_12 shade_50">
                      Create your first trading journal to get started
                    </span>
                  </div>
                  <button
                    className="button_pri flexRow flex_center gap_8"
                    onClick={handleCreateAccount}
                    disabled={loading}
                  >
                    <Plus size={16} />
                    <span>Create First Journal</span>
                  </button>
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
                            className={`accountCard flexClm gap_24 chart_boxBg ${
                              isDragging ? "dragging" : ""
                            } ${isLastTraded ? "lastTraded" : ""}`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            layout
                            onClick={() => handleAccountClick(acc._id)}
                          >
                            <div className="flexRow flexRow_stretch spaceBetween">
                              <div className="flexClm">
                                <div className="flexRow gap_8">
                                  <span className="font_16 font_weight_600">
                                    {acc.name}
                                  </span>
                                </div>
                                <div className="flexRow gap_12 margin_top_4">
                                  <span className="font_12 shade_50">
                                    {tradesCount[acc.name] ?? 0} trades
                                  </span>
                                  {isLastTraded && (
                                    <span className="font_12 success">
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

                            <div className="account-balances flexRow flexRow_stretch">
                              <div className="flexRow gap_4">
                                <span className="font_12 shade_50">
                                  Starting
                                </span>
                                <span className="font_14 font_weight_600">
                                  {formatCurrency(
                                    acc.startingBalance.amount,
                                    accountSymbols[acc.name]
                                  )}
                                </span>
                              </div>

                              <div className="flexRow gap_4">
                                <span className="font_12 shade_50">
                                  Current
                                </span>
                                <span
                                  className={`font_14 font_weight_600 ${
                                    (currentBalances[acc.name] ??
                                      acc.startingBalance.amount) >=
                                    acc.startingBalance.amount
                                      ? "success"
                                      : "error"
                                  }`}
                                >
                                  {formatCurrency(
                                    currentBalances[acc.name] ??
                                      acc.startingBalance.amount,
                                    accountSymbols[acc.name]
                                  )}
                                </span>
                              </div>
                            </div>

                            {/* Progress Bar (Optional) */}
                            <div className="progressSection">
                              <div className="progressBar">
                                <div
                                  className="progressFill"
                                  style={{
                                    width: `${
                                      ((currentBalances[acc.name] ??
                                        acc.startingBalance.amount) /
                                        acc.startingBalance.amount) *
                                      100
                                    }%`,
                                  }}
                                />
                              </div>
                              <div className="flexRow flexRow_stretch font_12 shade_50">
                                <span>PnL:</span>
                                <span>
                                  {formatCurrency(
                                    (currentBalances[acc.name] ??
                                      acc.startingBalance.amount) -
                                      acc.startingBalance.amount,
                                    accountSymbols[acc.name]
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Reorder.Item>
                      );
                    })}
                  </Reorder.Group>

                  {/* Show More/Less Button */}
                  {orderedAccounts.length > 2 && (
                    <button
                      className="button_sec flexRow gap_8 flex_center"
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
                      <span>Drag to reorder journals</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* {accounts.length <= 0 && (
          <MessageCard
            type="info"
            title="Best analysis place to learn trading by journaling"
            description="We offer analysis and education — no trading services provided."
          />
        )} */}

        <hr width="100" color="grey" />

        {/* Quick Actions Section */}
        <div
          className="flexClm gap_24"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <SectionHeader
            title="Quick Actions"
            description="Manage your trading data and access features"
            level={4} // uses <h2>
            // showButton={accounts.length > 0}
            // buttonLabel="Create journal"
            // onButtonClick={handleCreateAccount}
            loading={loading}
          />

          <div className="gridContainer">
            {quickActions.map((action) => {
              const IconComponent = action.icon;
              const isExternal = action.path.startsWith("http");

              const buttonContent = (
                <button
                  className={`boxBg flexRow gap_12 pad_16 ${
                    !action.enabled ? " disabled" : ""
                  }`}
                  style={{
                    fontFamily: "Poppins",
                    border: "var(--px-12)",
                    cursor: action.enabled ? "pointer" : "not-allowed",
                    width: "100%",
                  }}
                  whileHover={action.enabled ? { scale: 1.02 } : {}}
                  whileTap={action.enabled ? { scale: 0.98 } : {}}
                  disabled={!action.enabled}
                >
                  <div>
                    <IconComponent size={12} className="vector tag" />
                  </div>
                  <div className="flexClm gap_4" style={{ textAlign: "left" }}>
                    <span
                      className="font_14"
                      style={{ color: "var(--base-text)" }}
                    >
                      {action.title}
                    </span>
                    {action.description && (
                      <span className="font_12 shade_50">
                        {action.description}
                      </span>
                    )}
                  </div>
                </button>
              );

              // 🔹 Handle external vs internal links differently
              if (isExternal) {
                return (
                  <a
                    key={action.id}
                    href={action.enabled ? action.path : "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: "none" }}
                  >
                    {buttonContent}
                  </a>
                );
              } else {
                return (
                  <Link
                    key={action.id}
                    href={action.enabled ? action.path : "#"}
                    style={{ textDecoration: "none" }}
                  >
                    {buttonContent}
                  </Link>
                );
              }
            })}
          </div>
        </div>

        {/* <hr width="100" color="grey" /> */}

        {/* Plan Usage Overview */}
        {/* {userPlan && (
          <div className="flexClm gap_24">
            <SectionHeader
              title="Plan usage and benefits"
              description="Manage your plan usage"
              level={2} 
            
              loading={loading}
            />

            <div
              className="pad_16 flexClm gap_24 chart_boxBg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flexRow flexRow_stretch">
                <div className="flexClm">
                  <span className="font_16 font_weight_600">Current plan</span>
                </div>
                <div className="plan-badge flexRow gap_8">
                  <Check size={14} className="success" />
                  <span className="font_10 font_weight_600 success">
                    {userPlan?.planName || "Free Plan"}
                  </span>
                </div>
              </div>

              <div className="flexClm gap_24">
                <div className="flexClm gap_12">
                  <div className="flexRow flexRow_stretch">
                    <span className="font_14">Accounts</span>
                   
                    <span
                      className="font_12"
                      style={{ color: "var(--white-50)" }}
                    >
                      {planUsage.accounts.current}/{planUsage.accounts.limit}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ backgroundColor: "var(--primary)" }}
                      initial={{ width: 0 }}
                      animate={{ width: `${planUsage.accounts.percentage}%` }}
                      transition={{ duration: 1, delay: 0.2 }}
                    />
                  </div>
                </div>

                <div className="flexClm gap_12">
                  <div className="usage-header flexRow flexRow_stretch">
                    <span className="font_14">Monthly Trades</span>
                   
                    <span
                      className="font_12"
                      style={{ color: "var(--white-50)" }}
                    >
                      {planUsage.trades.current}/{planUsage.trades.limit}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ backgroundColor: "var(--success)" }}
                      initial={{ width: 0 }}
                      animate={{ width: `${planUsage.trades.percentage}%` }}
                      transition={{ duration: 1, delay: 0.4 }}
                    />
                  </div>
                </div>

                <div className="flexClm gap_12">
                  <div className="usage-header flexRow flexRow_stretch">
                    <span className="font_14">Monthly Images</span>
                   
                    <span
                      className="font_12"
                      style={{ color: "var(--white-50)" }}
                    >
                      {planUsage.images.current}/{planUsage.images.limit}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ backgroundColor: "var(--primary-light)" }}
                      initial={{ width: 0 }}
                      animate={{ width: `${planUsage.images.percentage}%` }}
                      transition={{ duration: 1, delay: 0.6 }}
                    />
                  </div>
                </div>
                <a
                  className="direct_tertiary flexRow gap_8 font_12"
                  onClick={(e) => {
                    router.push("/pricing"); // redirect to pricing page
                  }}
                >
                  Show all features <ChevronDown size={16} />
                </a>
              </div>
            </div>
          </div>
        )} */}

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
