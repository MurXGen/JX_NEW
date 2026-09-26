// contexts/DataContext.jsx
import { createContext, useContext, useState, useEffect, useRef } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { useRouter } from "next/router";
import { fetchAccountsAndTrades } from "@/utils/fetchAccountAndTrades";
import { getFromIndexedDB, saveToIndexedDB } from "@/utils/indexedDB";
import { calculateStats } from "@/utils/calculateStats";
import { fetchUserInfo } from "@/utils/userInfo";
import Toast from "@/components/revampV2/Toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const DataContext = createContext();

export const useData = () => useContext(DataContext);

/* Pages that must never trigger an authenticated user-info call */
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/view-trades",
  "/share-trades",
  "/pricing",
  "/pricingpage",
  "/contact",
  "/privacy-policy",
  "/terms-services",
  "/refund-policy",
  "/404",
];

/* don't re-hit user-info more than once per minute — rapid refreshes serve the
   cached copy instead, and auto-refresh once the window elapses */
const USERINFO_THROTTLE_MS = 60000;

export const DataProvider = ({ children }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null); // transient status toast (fades)
  const refreshTimer = useRef(null);
  const toastTimer = useRef(null);
  const flashToast = (msg, type = "success", ms = 3500) => {
    setToast({ type, msg });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), ms);
  };
  const [userData, setUserData] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [accountTrades, setAccountTrades] = useState([]);
  const [currentBalances, setCurrentBalances] = useState({});
  const [accountSymbols, setAccountSymbols] = useState({});
  const [tradesCount, setTradesCount] = useState({});
  const [stats, setStats] = useState({});
  const [dailyData, setDailyData] = useState([]);
  const [candles, setCandles] = useState([]);
  const [longTrades, setLongTrades] = useState(0);
  const [shortTrades, setShortTrades] = useState(0);
  const [apiCallFailed, setApiCallFailed] = useState(false);

  /* load state from the IndexedDB cache (no network) */
  const hydrateFromCache = async () => {
    try {
      const cachedUser = await getFromIndexedDB("user-data");
      if (!cachedUser) {
        console.warn("No cached data available");
        return false;
      }
      setUserData(cachedUser);
      const cachedAccounts = cachedUser.accounts || [];
      const cachedTrades = cachedUser.trades || [];
      setAccounts(cachedAccounts);
      setAccountTrades(cachedTrades);
      const symbols = {};
      const counts = {};
      cachedTrades.forEach((trade) => {
        if (trade.accountId) {
          counts[trade.accountId] = (counts[trade.accountId] || 0) + 1;
          if (trade.symbol) {
            if (!symbols[trade.accountId]) symbols[trade.accountId] = new Set();
            symbols[trade.accountId].add(trade.symbol);
          }
        }
      });
      const symbolArrays = {};
      Object.keys(symbols).forEach((key) => {
        symbolArrays[key] = Array.from(symbols[key]);
      });
      setAccountSymbols(symbolArrays);
      setTradesCount(counts);
      updateDerivedData(cachedTrades);
      return true;
    } catch (e) {
      console.error("Failed to load cached data:", e);
      return false;
    }
  };

  const loadData = async (force = false) => {
    /* Skip entirely on public/auth pages or when there is no session,
       otherwise the 401 from user-info surfaces as a dev error overlay
       on the login screen. */
    if (
      PUBLIC_PATHS.includes(router.pathname) ||
      Cookies.get("isVerified") !== "yes"
    ) {
      setLoading(false);
      return;
    }

    // ⏱️ Throttle: if user-info was fetched < 1 min ago (e.g. rapid refreshes),
    // serve the cached copy instead of hammering the API, show a countdown, and
    // auto-refresh once the window elapses.
    const now = Date.now();
    const last = Number(
      (typeof window !== "undefined" && localStorage.getItem("jx-userinfo-at")) || 0,
    );
    if (!force && last && now - last < USERINFO_THROTTLE_MS) {
      setLoading(true);
      await hydrateFromCache();
      setLoading(false);
      const until = last + USERINFO_THROTTLE_MS;
      const secs = Math.max(1, Math.ceil((until - now) / 1000));
      flashToast(`Loading up your data · fresh data in ${secs}s`);
      clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => loadData(true), Math.max(0, until - now));
      return;
    }

    setLoading(true);
    setApiCallFailed(false);

    try {
      // 1️⃣ Fetch user-info from API (shared cache → de-dupes with the
      // dashboard's own call and caps repeats)
      const userRes = await fetchUserInfo();

      const { userData: fetchedUserData } = userRes.data;
      setUserData(fetchedUserData);
      // remember when we last fetched, for the throttle above
      try { localStorage.setItem("jx-userinfo-at", String(Date.now())); } catch {}

      // Save to IndexedDB
      if (fetchedUserData) {
        await saveToIndexedDB("user-data", fetchedUserData);
        if (fetchedUserData?.plans)
          await saveToIndexedDB("plans", fetchedUserData.plans);
        if (fetchedUserData?.name)
          localStorage.setItem("userName", fetchedUserData.name);
      }

      // 2️⃣ Fetch accounts + trades
      const result = await fetchAccountsAndTrades();

      if (result.redirectToLogin) {
        router.push("/login");
        return;
      }

      // Update all state with fresh data
      setAccounts(result.accounts);
      setAccountSymbols(result.accountSymbols);
      setCurrentBalances(result.currentBalances);
      setTradesCount(result.tradesCount);
      setAccountTrades(result.trades || []);

      // Compute derived data from fresh trades
      updateDerivedData(result.trades || []);
    } catch (err) {
      if (err?.response?.status === 401) {
        /* expected when the session expired, warn, don't error-overlay */
        console.warn("Session not authenticated, using cached data if any");
      } else {
        console.warn("API load failed, falling back to cache:", err?.message);
      }
      setApiCallFailed(true);

      // Fallback to IndexedDB
      await hydrateFromCache();
    } finally {
      setLoading(false);
    }
  };

  // Helper function to update derived data
  const updateDerivedData = (trades) => {
    const computedStats = calculateStats(trades);
    setStats(computedStats);

    // Daily PnL data
    const daily = trades.map((t) => ({
      date: t.closeTime,
      pnl: Number(t.pnl) || 0,
    }));
    setDailyData(daily);

    // Long/Short counts
    const long = trades.filter(
      (t) => t.direction?.toLowerCase() === "long" && t.closeTime,
    ).length;
    const short = trades.filter(
      (t) => t.direction?.toLowerCase() === "short" && t.closeTime,
    ).length;
    setLongTrades(long);
    setShortTrades(short);
  };

  // Refresh data (can be called after adding/editing trades) — forced past the
  // throttle since it follows a real user change, not a page refresh
  const refreshData = async () => {
    await loadData(true);
  };

  // clean up timers on unmount
  useEffect(() => () => {
    clearTimeout(refreshTimer.current);
    clearTimeout(toastTimer.current);
  }, []);

  useEffect(() => {
    /* re-evaluate on route change: public → private navigation (e.g.
       right after login) loads data once; already-loaded data is kept */
    if (userData && !PUBLIC_PATHS.includes(router.pathname)) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.pathname]);

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

  const selectedAccountId = Cookies.get("accountId");
  const currentAccount =
    accounts.find((a) => a._id === selectedAccountId) || accounts[0];

  const isFree = userData?.subscription?.plan === "free";
  const isProMonthly =
    userData?.subscription?.plan === "pro" &&
    userData?.subscription?.type === "one-time";

  const value = {
    // States
    loading,
    userData,
    accounts,
    accountTrades,
    currentBalances,
    accountSymbols,
    tradesCount,
    stats,
    dailyData,
    longTrades,
    shortTrades,
    currentAccount,
    selectedAccountId,
    isFree,
    isProMonthly,
    apiCallFailed,

    // Methods
    refreshData,
    setAccountTrades,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
      <Toast toast={toast} />
    </DataContext.Provider>
  );
};
