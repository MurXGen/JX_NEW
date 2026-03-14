// contexts/DataContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { useRouter } from "next/router";
import { fetchAccountsAndTrades } from "@/utils/fetchAccountAndTrades";
import { getFromIndexedDB, saveToIndexedDB } from "@/utils/indexedDB";
import { calculateStats } from "@/utils/calculateStats";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
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

  const loadData = async () => {
    setLoading(true);
    setApiCallFailed(false);

    try {
      // 1️⃣ Fetch user-info from API
      const userRes = await axios.get(`${API_BASE}/api/auth/user-info`, {
        withCredentials: true,
      });

      const { userData: fetchedUserData } = userRes.data;
      setUserData(fetchedUserData);

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
      console.error("API load failed, falling back to cache:", err);
      setApiCallFailed(true);

      // Fallback to IndexedDB
      try {
        const cachedUser = await getFromIndexedDB("user-data");

        if (cachedUser) {
          setUserData(cachedUser);

          // Get cached accounts and trades
          const cachedAccounts = cachedUser.accounts || [];
          const cachedTrades = cachedUser.trades || [];

          setAccounts(cachedAccounts);
          setAccountTrades(cachedTrades);

          // Reconstruct other data from cached values
          // Note: You might need to recalculate these from cached data
          const symbols = {};
          const balances = {};
          const counts = {};

          cachedTrades.forEach((trade) => {
            if (trade.accountId) {
              counts[trade.accountId] = (counts[trade.accountId] || 0) + 1;
              if (trade.symbol) {
                if (!symbols[trade.accountId])
                  symbols[trade.accountId] = new Set();
                symbols[trade.accountId].add(trade.symbol);
              }
            }
          });

          // Convert Sets to Arrays for symbol
          const symbolArrays = {};
          Object.keys(symbols).forEach((key) => {
            symbolArrays[key] = Array.from(symbols[key]);
          });

          setAccountSymbols(symbolArrays);
          setTradesCount(counts);

          // Compute derived data from cached trades
          updateDerivedData(cachedTrades);
        } else {
          console.warn("No cached data available");
        }
      } catch (cacheError) {
        console.error("Failed to load cached data:", cacheError);
      }
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

  // Refresh data (can be called after adding/editing trades)
  const refreshData = async () => {
    await loadData();
  };

  useEffect(() => {
    loadData();
  }, []);

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

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
