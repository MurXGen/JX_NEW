/* Centralized app state — auth token, current user/userData, and the cached
   "user-data" snapshot (MMKV). Everything that used to live across cookies +
   IndexedDB + localStorage on web is funneled through here on mobile. */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getToken, saveToken, clearToken } from "../lib/secureStore";
import { getItem, setItem, getFromStore, saveToStore, removeItem, KEYS } from "../lib/storage";
import { setUnauthorizedHandler } from "../api/client";
import { fetchUserInfo } from "../api/auth";
import { initPurchases } from "../lib/purchases";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [booting, setBooting] = useState(true);
  const [token, setToken] = useState(null);
  const [userData, setUserData] = useState(null);
  const [selectedAccountId, setSelectedAccountId] = useState(
    () => getItem(KEYS.accountId) || null,
  );

  // boot: load cached token + user-data instantly, then refresh from API
  useEffect(() => {
    (async () => {
      const t = await getToken();
      const cached = await getFromStore(KEYS.userData);
      if (cached) setUserData(cached);
      if (t) {
        setToken(t);
        refresh().catch(() => {});
      }
      setBooting(false);
    })();
    setUnauthorizedHandler(() => {
      // token rejected by server → drop to logged-out state
      setToken(null);
      setUserData(null);
    });
  }, []);

  // pull fresh user data from the backend and cache it
  const refresh = useCallback(async () => {
    try {
      const data = await fetchUserInfo();
      if (data) {
        setUserData(data);
        await saveToStore(KEYS.userData, data);
        if (data.name) await saveToStore(KEYS.userName, data.name);
      }
      return data;
    } catch (e) {
      return null;
    }
  }, []);

  // true only right after a brand-new registration (Google native isNewUser) —
  // drives the one-time onboarding guide. Never set on a normal login.
  const [justRegistered, setJustRegistered] = useState(false);
  const clearJustRegistered = useCallback(() => setJustRegistered(false), []);

  // called by every successful auth path
  const completeLogin = useCallback(async ({ token: t, userData: data, isNewUser }) => {
    if (t) {
      await saveToken(t);
      setToken(t);
    }
    if (isNewUser) setJustRegistered(true);
    if (data) {
      setUserData(data);
      await saveToStore(KEYS.userData, data);
    } else {
      // OTP-verify responses may omit userData → fetch it
      await refresh();
    }
  }, [refresh]);

  const logout = useCallback(async () => {
    await clearToken();
    removeItem(KEYS.userData);
    setToken(null);
    setUserData(null);
    setJustRegistered(false);
  }, []);

  // ---- subscription helper (status shown from the user data we already have) ----
  const subscription = useMemo(() => {
    const u = userData || {};
    const sub = u.subscription || {
      plan: u.subscriptionPlan,
      status: u.subscriptionStatus,
      type: u.subscriptionType,
      expiresAt: u.subscriptionExpiresAt,
    };
    const status = sub.status || "none";
    const expiresAt = sub.expiresAt ? new Date(sub.expiresAt) : null;
    const isPro =
      status === "active" && (sub.plan === "pro" || sub.plan === "lifetime");
    const daysLeft = expiresAt
      ? Math.max(0, Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24)))
      : null;
    return { ...sub, status, expiresAt, isPro, daysLeft };
  }, [userData]);

  // identify the user to RevenueCat so purchases attach to this account
  const uid = userData?.userId || userData?._id;
  useEffect(() => {
    if (uid) initPurchases(String(uid)).catch(() => {});
  }, [uid]);

  // ---- journals (accounts) ----
  const accounts = userData?.accounts || [];
  const currentAccount = useMemo(() => {
    if (!accounts.length) return null;
    return accounts.find((a) => a._id === selectedAccountId) || accounts[0];
  }, [accounts, selectedAccountId]);

  const selectAccount = useCallback((id) => {
    setSelectedAccountId(id);
    setItem(KEYS.accountId, id);
  }, []);

  // trades for the current journal
  const trades = useMemo(() => {
    const all = userData?.trades || [];
    if (!currentAccount) return all;
    return all.filter((t) => t.accountId === currentAccount._id || !t.accountId);
  }, [userData, currentAccount]);

  // optimistic insert after a successful addTrade, then refresh in background
  const addTradeLocal = useCallback((trade) => {
    if (!trade) return;
    setUserData((prev) => {
      const next = { ...(prev || {}), trades: [...((prev || {}).trades || []), trade] };
      saveToStore(KEYS.userData, next);
      return next;
    });
    refresh().catch(() => {});
  }, [refresh]);

  // replace the cached userData (e.g. after creating a journal, which returns
  // the full refreshed userData from the backend)
  const applyUserData = useCallback((data) => {
    if (!data) return;
    setUserData(data);
    saveToStore(KEYS.userData, data);
  }, []);

  const value = useMemo(
    () => ({
      booting,
      isAuthed: !!token,
      token,
      userData,
      subscription,
      accounts,
      currentAccount,
      selectAccount,
      trades,
      addTradeLocal,
      applyUserData,
      refresh,
      completeLogin,
      logout,
      justRegistered,
      clearJustRegistered,
    }),
    [booting, token, userData, subscription, accounts, currentAccount, selectAccount, trades, addTradeLocal, applyUserData, refresh, completeLogin, logout, justRegistered, clearJustRegistered],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
