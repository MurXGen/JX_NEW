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
    const params = new URLSearchParams(window.location.search);
    const isVerified = params.get("isVerified");

    if (isVerified === "yes") {
      Cookies.set("isVerified", "yes", {
        path: "/",
        sameSite: "Strict",
        expires: 3650,
      });
    }

    // Optionally clean the URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }, []);

  // Check localStorage for guide on mount
  useEffect(() => {
    const guideFlag = localStorage.getItem("guide");
    if (guideFlag === "yes") {
      setShowGuide(true);
    }
  }, []);

  const handleCloseGuide = () => {
    setShowGuide(false);
    localStorage.removeItem("guide"); // clear guide flag
  };

  useEffect(() => {
    const savedOrder = JSON.parse(localStorage.getItem("accountOrder") || "[]");
    if (savedOrder.length && accounts.length) {
      // Map saved order to actual account objects when possible
      const mapById = new Map(accounts.map((a) => [a._id, a]));
      const reordered = savedOrder.map((id) => mapById.get(id)).filter(Boolean);

      // append any accounts not present in savedOrder at the end
      const missing = accounts.filter((a) => !savedOrder.includes(a._id));
      setOrderedAccounts([...reordered, ...missing]);
    } else {
      setOrderedAccounts(accounts);
    }
  }, [accounts]);

  // Helper to persist order
  useEffect(() => {
    if (orderedAccounts.length > 0) {
      const order = orderedAccounts.map((acc) => acc._id);
      localStorage.setItem("accountOrder", JSON.stringify(order));
    }
  }, [orderedAccounts]);

  // displayedAccounts remains a derived view
  const displayedAccounts = showAllAccounts
    ? orderedAccounts
    : orderedAccounts.slice(0, 2);

  // NEW: handler that receives the reordered visible list and merges it
  const handleReorderVisible = (newVisibleOrder) => {
    // If showing all, newVisibleOrder is the full order — replace completely
    if (showAllAccounts) {
      setOrderedAccounts(newVisibleOrder);
      return;
    }

    // Otherwise we only displayed a prefix (slice). We'll replace that prefix
    // with the new visible order while keeping the rest of the list.
    const rest = orderedAccounts.slice(newVisibleOrder.length);
    const merged = [...newVisibleOrder, ...rest];

    // Safety: if some items in rest accidentally also appear in newVisibleOrder,
    // remove duplicates keeping first appearance in merged
    const seen = new Set();
    const deduped = [];
    for (const item of merged) {
      const id = item._id ?? item; // item may be object or primitive depending on your setup
      const key = typeof id === "string" ? id : JSON.stringify(item);
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(item);
      }
    }

    setOrderedAccounts(deduped);
  };

  useEffect(() => {
    const loadUser = async () => {
      setLoading(true);

      try {
        const cachedUser = await getFromIndexedDB("user-data");
        const hasData = cachedUser && Object.keys(cachedUser).length > 0;

        const refreshKey = "user-refresh-info";
        const now = new Date();
        let refreshInfo = JSON.parse(localStorage.getItem(refreshKey)) || {
          count: 0,
          firstRefreshAt: null,
        };

        // Reset hourly limit if 1 hour passed
        if (
          !refreshInfo.firstRefreshAt ||
          now - new Date(refreshInfo.firstRefreshAt) > 60 * 60 * 1000
        ) {
          refreshInfo.count = 0;
          refreshInfo.firstRefreshAt = now;
        }

        // Check subscription expiration
        let subscriptionExpired = false;
        if (cachedUser?.subscription?.expiresAt) {
          const expiryDate = new Date(cachedUser.subscription.expiresAt);
          if (expiryDate < now) subscriptionExpired = true;
        }

        // Handle expired subscription
        if (subscriptionExpired) {
          try {
            const res = await axios.put(
              `${API_BASE}/api/auth/update-subscription`,
              {
                subscriptionType: "none",
                subscriptionPlan: "free",
                subscriptionStatus: "expired",
              },
              { withCredentials: true }
            );

            // Update IndexedDB immediately
            if (hasData) {
              cachedUser.subscription.status = "expired";
              cachedUser.subscription.planId = "free";
              cachedUser.subscription.type = "none";
              cachedUser.subscription.startAt = null;
              cachedUser.subscription.expiresAt = null;
              await saveToIndexedDB("user-data", cachedUser);
            }
          } catch (err) {
            // Do nothing — handled silently
          }
        }

        const canFetch = refreshInfo.count < 10;

        // Fetch fresh data if within limit
        if (canFetch) {
          try {
            refreshInfo.count += 1;
            if (!refreshInfo.firstRefreshAt) refreshInfo.firstRefreshAt = now;
            localStorage.setItem(refreshKey, JSON.stringify(refreshInfo));

            const res = await axios.get(`${API_BASE}/api/auth/user-info`, {
              withCredentials: true,
            });
            const { userData } = res.data;

            if (userData) {
              await saveToIndexedDB("user-data", userData);
              if (userData?.plans)
                await saveToIndexedDB("plans", userData.plans);
              if (userData?.name)
                localStorage.setItem("userName", userData.name);
            }
          } catch (err) {
            // Do nothing — handled silently
          }
        }
      } catch (error) {
        // Silent fail
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      setLoading(true);
      try {
        const cachedUser = await getFromIndexedDB("user-data");
        const hasData = cachedUser && Object.keys(cachedUser).length > 0;

        // Load user plan and calculate usage
        if (hasData) {
          const planRules = getPlanRules(cachedUser);
          setUserPlan(planRules);

          // Calculate current usage
          const currentUsage = calculatePlanUsage(cachedUser, planRules);
          setPlanUsage(currentUsage);
        }

        // ... existing refresh logic ...
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const calculatePlanUsage = (userData, planRules) => {
    const accountsCount = userData.accounts?.length || 0;
    const tradesCount = userData.trades?.length || 0;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // Monthly trades
    const monthlyTrades =
      userData.trades?.filter((trade) => {
        const tradeDate = new Date(trade.openTime);
        return (
          tradeDate.getMonth() === currentMonth &&
          tradeDate.getFullYear() === currentYear
        );
      }).length || 0;

    // Monthly images
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

  useEffect(() => {
    const verified = Cookies.get("isVerified");
    if (verified !== "yes") {
      router.push("/login");
      return;
    }

    const fetchAccountsAndTrades = async () => {
      try {
        const cachedUserData = await getFromIndexedDB("user-data");
        const userData = cachedUserData;

        if (!userData) {
          setLoading(false);
          return;
        }

        // 🟩 Derive active plan rules
        const planRules = getPlanRules(userData);

        // 🟩 Extract user plan info
        if (userData.subscription?.planId) {
          const activePlanId = userData.subscription.planId;
          const matchedPlan =
            userData.plans?.find((p) => p.planId === activePlanId) || null;

          const planName =
            matchedPlan?.name ||
            activePlanId.charAt(0).toUpperCase() + activePlanId.slice(1);

          // ✅ Merge rules + subscription info
          setUserPlan({
            ...userData.subscription,
            planName,
            ...planRules, // adds booleans like canExportTrades, canShareTrades, etc.
          });
        }

        // 🟩 Process accounts & trades
        if (userData.accounts?.length > 0) {
          setAccounts(userData.accounts);
          buildSymbolMap(userData.accounts);

          if (userData.trades?.length > 0) {
            const balanceMap = {};
            const countMap = {};

            userData.accounts.forEach((acc) => {
              const starting = acc.startingBalance?.amount || 0;
              const tradesForAcc = userData.trades.filter(
                (t) => t.accountId === acc._id
              );
              const pnlSum = tradesForAcc.reduce(
                (sum, t) => sum + (Number(t.pnl) || 0),
                0
              );

              balanceMap[acc.name] = starting + pnlSum;
              countMap[acc.name] = tradesForAcc.length;
            });

            setCurrentBalances(balanceMap);
            setTradesCount(countMap);
          } else {
            const emptyCountMap = {};
            userData.accounts.forEach((acc) => {
              emptyCountMap[acc.name] = 0;
            });
            setTradesCount(emptyCountMap);
          }
        }
      } catch (err) {
        error("Error fetching user data:", err);
      } finally {
        setLoading(false);
      }
    };

    const buildSymbolMap = (accountsData) => {
      const symbolMap = {};
      accountsData.forEach((acc) => {
        switch (acc.currency?.toUpperCase()) {
          case "USD":
            symbolMap[acc.name] = "$";
            break;
          case "INR":
            symbolMap[acc.name] = "₹";
            break;
          case "USDT":
            symbolMap[acc.name] = "₮";
            break;
          default:
            symbolMap[acc.name] = "¤";
        }
      });
      setAccountSymbols(symbolMap);
    };

    fetchAccountsAndTrades();
  }, [router]);

  const handleAccountClick = (accountId) => {
    try {
      Cookies.set("accountId", accountId, {
        path: "/",
        sameSite: "Strict",
        expires: 1 / 24,
      });
      router.push("/dashboard");
    } catch (err) {}
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
      // enabled: userPlan?.canExportTrades || false,
      enabled: true,
    },
    {
      id: "share-trades",
      title: "Share journal",
      description: "Share your trading performance",
      icon: Share2,
      path: "/share-trades",
      // enabled: userPlan?.canShareTrades || false,
      enabled: true,
    },
    {
      id: "market-news",
      title: "Events calendar",
      description: "Forex factory's market updates",
      icon: TrendingUp,
      path: "https://www.forexfactory.com/calendar",
      // enabled: userPlan?.canAccessFinancialNews || false,
      enabled: true,
    },
  ];

  // Drag and drop handlers
  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };
  if (loading) {
    return <FullPageLoader />;
  }

  return (
    <>
      <Head>
        <title>JournalX | Accounts</title>
        <meta
          name="description"
          content="Manage your JournalX trading accounts. Add, view, and analyze your performance across multiple portfolios in one place."
        />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="JournalX" />
        <meta property="og:title" content="JournalX | Accounts" />
        <meta
          property="og:description"
          content="Access and manage all your JournalX accounts with a unified dashboard."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://journalx.app/accounts" />
        <meta property="og:image" content="/assets/Journalx_Banner.png" />
        <link rel="canonical" href="https://journalx.app/accounts" />
      </Head>

      <div className="dashboard flexClm gap_32">
        <Navbar />
        <BackgroundBlur />

        <SectionHeader
          title="Journals"
          description="Select you journal"
          level={2} // uses <h2>
          showButton={accounts.length > 0}
          buttonLabel="Create journal"
          onButtonClick={handleCreateAccount}
          loading={loading}
        />

        {/* Accounts List */}
        <motion.div
          className="accountsList flexClm gap_16"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {orderedAccounts.length === 0 ? (
            <motion.div
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
            </motion.div>
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
                      <motion.div
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
                                <span className="font_12 success">Active</span>
                              )}
                            </div>
                          </div>

                          <div className="flexRow gap_8 flex_center">
                            {/* Drag Handle */}
                            <motion.div
                              className="dragHandle flexRow flex_center"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              title="Drag to reorder"
                            >
                              <GripVertical size={16} className="shade_50" />
                            </motion.div>

                            <ArrowRight
                              size={18}
                              className="vector cursor_pointer"
                              onClick={() => handleAccountClick(acc._id)}
                            />
                          </div>
                        </div>

                        <div className="account-balances flexRow flexRow_stretch">
                          <div className="flexRow gap_4">
                            <span className="font_12 shade_50">Starting</span>
                            <span className="font_14 font_weight_600">
                              {formatCurrency(
                                acc.startingBalance.amount,
                                accountSymbols[acc.name]
                              )}
                            </span>
                          </div>

                          <div className="flexRow gap_4">
                            <span className="font_12 shade_50">Current</span>
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
                      </motion.div>
                    </Reorder.Item>
                  );
                })}
              </Reorder.Group>

              {/* Show More/Less Button */}
              {orderedAccounts.length > 2 && (
                <motion.button
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
                </motion.button>
              )}

              {/* Drag Hint */}
              {orderedAccounts.length > 1 && (
                <motion.div
                  className="dragHint flexRow gap_8 flex_center font_12 shade_50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <GripVertical size={12} />
                  <span>Drag to reorder journals</span>
                </motion.div>
              )}
            </>
          )}
        </motion.div>

        {/* {accounts.length <= 0 && (
          <MessageCard
            type="info"
            title="Best analysis place to learn trading by journaling"
            description="We offer analysis and education — no trading services provided."
          />
        )} */}

        <hr width="100" color="grey" />

        {/* Quick Actions Section */}
        <motion.div
          className="flexClm gap_24"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <SectionHeader
            title="Quick Actions"
            description="Manage your trading data and access features"
            level={2} // uses <h2>
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
                <motion.button
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
                </motion.button>
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
        </motion.div>

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

            <motion.div
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
                    <motion.div
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
                    <motion.div
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
                    <motion.div
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
            </motion.div>
          </div>
        )} */}

        {showGuide && <BeginnerGuide onClose={handleCloseGuide} />}
        <GoogleBannerAd />
      </div>
    </>
  );
}

export default Accounts;
