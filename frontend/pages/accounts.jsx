"use client";

import { childVariants, containerVariants } from "@/animations/motionVariants";
import Navbar from "@/components/Trades/Navbar";
import BackgroundBlur from "@/components/ui/BackgroundBlur";
import FullPageLoader from "@/components/ui/FullPageLoader";
import WelcomeModal from "@/components/ui/WelcomeModal";
import { formatCurrency } from "@/utils/formatNumbers";
import { getFromIndexedDB, saveToIndexedDB } from "@/utils/indexedDB";
import axios from "axios";
import { motion } from "framer-motion";
import Cookies from "js-cookie";
import { ArrowRight, Plus } from "lucide-react";
import Head from "next/head";
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
    const verified = Cookies.get("isVerified");

    if (verified !== "yes") {
      router.push("/login");
      return;
    }

    const fetchAccountsAndTrades = async () => {
      try {
        const cachedUserData = await getFromIndexedDB("user-data");

        // ✅ Directly use cachedUserData (not cachedUserData.userData)
        const userData = cachedUserData;

        if (userData?.accounts?.length > 0) {
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
            // No trades found
            const emptyCountMap = {};
            userData.accounts.forEach((acc) => {
              emptyCountMap[acc.name] = 0;
            });
            setTradesCount(emptyCountMap);
          }
        } else {
          console.warn(
            "⚠ No accounts found in IndexedDB — consider fetching from API..."
          );
        }
      } catch (err) {
      } finally {
        setLoading(false); // ✅ Stop loader
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
      // 1️⃣ Save account ID in cookies with long expiry (~10 years)
      Cookies.set("accountId", accountId, {
        path: "/",
        sameSite: "Strict",
        expires: 1 / 24, // 1 hour
      });

      // 2️⃣ Redirect to home page
      router.push("/");
    } catch (err) {}
  };

  const handleClick = async () => {
    setLoading(true);
    router.push("/create-account");
  };

  if (loading) {
    return <FullPageLoader />; // 👈 show loader until data is fetched
  }

  return (
    <>
      {/* ✅ SEO + Metadata */}
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

        <div className="flexRow flexRow_stretch">
          <div className="flexClm">
            <span className="font_20">Accounts</span>
            <span className="font_12" style={{ color: "#ffffff60" }}>
              Select account to proceed with
            </span>
          </div>
          {accounts.length > 0 && (
            <button
              className="button_sec flexRow"
              onClick={handleClick}
              disabled={loading}
            >
              <Plus size={16} />
            </button>
          )}
        </div>

        <motion.div
          className="accountsList flexClm gap_24"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {accounts.length === 0 ? (
            <motion.div className="notFound" variants={childVariants}>
              <FiDatabase size={48} className="vector" /> {/* Icon */}
              <span className="font_12">
                No account found. You can create one.
              </span>
              <button
                className="button_sec flexRow"
                onClick={handleClick}
                disabled={loading}
              >
                <span>Create account</span>
                <Plus size={16} />
              </button>
            </motion.div>
          ) : (
            accounts.map((acc) => {
              const lastTradedAccountId = Cookies.get("accountId");
              const isLastTraded = acc._id === lastTradedAccountId;

              return (
                <motion.div
                  key={acc._id}
                  className="accountCard flexClm gap_16"
                  variants={childVariants}
                  onClick={() => handleAccountClick(acc._id)}
                >
                  <div
                    className="accountName flexRow flexRow_stretch"
                    style={{
                      borderBottom: "0.5px solid #ffffff33",
                      padding: "0 0 8px 0",
                      margin: "0 0 4px 0",
                    }}
                  >
                    <span
                      className="font_16 flexRow flex_center gap_12"
                      style={{ color: "#ffffffcc" }}
                    >
                      {acc.name}
                      {isLastTraded && (
                        <span
                          className="font_8"
                          style={{
                            borderLeft: "1px solid grey",
                            paddingLeft: "8px",
                          }}
                        >
                          Last traded
                        </span>
                      )}
                    </span>
                    <div className="flexRow gap_12">
                      <span className="font_12">
                        Trades: {tradesCount[acc.name] ?? 0}{" "}
                      </span>
                      <ArrowRight size={16} className="vector" />
                    </div>
                  </div>

                  <div className="accountBalance flexRow flexRow_stretch">
                    <div className="flexClm gap_4 font_12">
                      <span className="font_12" style={{ color: "#ffffff80" }}>
                        Starting Balance
                      </span>
                      <span className="accountAmounts font_16">
                        {formatCurrency(
                          acc.startingBalance.amount,
                          accountSymbols[acc.name]
                        )}
                      </span>
                    </div>

                    <div className="flexClm gap_4 font_12">
                      <span style={{ color: "#ffffff80" }}>
                        Current Balance
                      </span>

                      <span
                        className={`accountAmounts font_16 ${
                          (currentBalances[acc.name] ??
                            acc.startingBalance.amount) >=
                          acc.startingBalance.amount
                            ? "success"
                            : "error"
                        }`}
                        style={{ textAlign: "right" }}
                      >
                        {formatCurrency(
                          currentBalances[acc.name] ??
                            acc.startingBalance.amount,
                          accountSymbols[acc.name]
                        )}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </motion.div>
      </div>
    </>
  );
}

export default Accounts;
