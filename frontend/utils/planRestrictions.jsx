import dayjs from "dayjs";
import Cookies from "js-cookie";
import { getFromIndexedDB } from "./indexedDB";

/* -------------------------------------------------------------------------- */
/* 🛠️ PLAN RULES (Corrected to match backend)                                   */
/* -------------------------------------------------------------------------- */

export const PLAN_RULES = {
  free: {
    limits: {
      tradeLimitPerMonth: 30,
      quickTradeLimitPerMonth: 30,
      accountLimit: 1, // 1 journal
      imagesPerTrade: 1, // 1 screenshot per trade
      imageLimitPerMonth: Infinity, // gated per-trade instead of per-month
      maxImageSizeMB: 10,
      chartLogLimitPerMonth: 5, // chart annotation (entry/exit) — 5 / month
      historyDays: 30,
    },
    features: {
      logTrades: "10/month",
      multipleAccounts: "1 journal",
      showsAds: true,
      basicCharts: true,
      advancedCharts: false,
      aiAnalysis: false,
      imageUpload: false,
      quickTradeLog: true,
      multipleEntries: false,
      backupData: false,
      integration: false,
      exportTrades: false,
      fullHistory: false,
      shareTrades: false,
    },
  },

  pro: {
    limits: {
      tradeLimitPerMonth: Infinity,
      quickTradeLimitPerMonth: Infinity,
      accountLimit: 3, // 3 journals
      imagesPerTrade: 4,
      imageLimitPerMonth: Infinity,
      maxImageSizeMB: 25,
      chartLogLimitPerMonth: Infinity,
      historyDays: Infinity,
    },
    features: {
      logTrades: "Unlimited",
      multipleAccounts: "3 journals",
      showsAds: false,
      basicCharts: true,
      advancedCharts: true,
      aiAnalysis: true, // advanced analytics
      imageUpload: true,
      quickTradeLog: true,
      multipleEntries: true,
      backupData: true,
      integration: true,
      exportTrades: true,
      fullHistory: true,
      shareTrades: true,
    },
  },

  lifetime: {
    limits: {
      tradeLimitPerMonth: Infinity,
      quickTradeLimitPerMonth: Infinity,
      accountLimit: Infinity,
      imagesPerTrade: 4,
      imageLimitPerMonth: Infinity,
      maxImageSizeMB: 50,
      chartLogLimitPerMonth: Infinity,
      historyDays: Infinity,
    },
    features: {
      logTrades: "Unlimited",
      multipleAccounts: "Unlimited journals",
      showsAds: false,
      basicCharts: true,
      advancedCharts: true,
      aiAnalysis: true,
      imageUpload: true,
      quickTradeLog: true,
      multipleEntries: true,
      backupData: true,
      integration: true,
      exportTrades: true,
      fullHistory: true,
      prioritySupport: true,
      earlyBetaAccess: true,
    },
  },
};

/* -------------------------------------------------------------------------- */
/* 🔄 Normalize plan + status into consistent rule set                         */
/* -------------------------------------------------------------------------- */
export const getPlanRules = (userData) => {
  const subscription =
    userData?.value?.subscription || userData?.subscription || {};

  const plan = subscription.plan || subscription.planId || "free";
  const status = subscription.status || "none";

  // ⛔ Not active → force FREE
  if (status !== "active") return PLAN_RULES.free;

  const normalized = (plan || "free").toLowerCase();

  // ⛔ Dated plan (e.g. trial) whose expiry has passed → FREE, even if the
  // backend hasn't flipped the status yet (lazy expiry).
  if (
    !normalized.includes("lifetime") &&
    subscription.expiresAt &&
    new Date(subscription.expiresAt).getTime() < Date.now()
  ) {
    return PLAN_RULES.free;
  }

  if (normalized.includes("lifetime")) return PLAN_RULES.lifetime;
  if (normalized.includes("pro")) return PLAN_RULES.pro;

  return PLAN_RULES.free;
};

/* -------------------------------------------------------------------------- */
/* 🎯 Feature + Limit Enforcement                                              */
/* -------------------------------------------------------------------------- */

// Ads
export const canShowAds = (userData) => {
  const rules = getPlanRules(userData);
  return rules.features.showsAds;
};

// Cookie account id
const getActiveAccountId = () => Cookies.get("accountId");

// Trade limit
export const canAddTrade = async (userData, tradeStatus = "closed") => {
  const user = userData?.value || userData;
  const rules = getPlanRules(userData);

  const tradeLimit =
    tradeStatus === "running"
      ? rules.limits.quickTradeLimitPerMonth
      : rules.limits.tradeLimitPerMonth;

  if (tradeLimit === Infinity) return true;

  const trades = user?.trades || [];
  const now = dayjs();
  const activeAccountId = getActiveAccountId();

  const tradesThisMonth = trades.filter((t) => {
    if (!t.openTime) return false;
    if (activeAccountId && t.accountId !== activeAccountId) return false;

    const tradeDate = dayjs(t.openTime);
    if (
      tradeDate.isValid() &&
      tradeDate.month() === now.month() &&
      tradeDate.year() === now.year()
    ) {
      if (tradeStatus === "running") return t.status === "running";
      return t.status === "closed";
    }
    return false;
  }).length;

  return tradesThisMonth < tradeLimit;
};

// Account limit
export const canAddAccount = (userData, accountCount) => {
  const rules = getPlanRules(userData);
  return accountCount < rules.limits.accountLimit;
};

// Image upload
export const canUploadImage = async (userData, newImageSizeMB) => {
  const user = userData?.value || userData;
  const rules = getPlanRules(userData);
  const { maxImageSizeMB, imageLimitPerMonth } = rules.limits;

  if (newImageSizeMB > maxImageSizeMB) return false;
  if (imageLimitPerMonth === Infinity) return true;

  const trades = user?.trades || [];
  const now = dayjs();
  const activeAccountId = getActiveAccountId();

  let imagesThisMonth = 0;

  trades.forEach((t) => {
    if (!t.openTime) return;
    if (activeAccountId && t.accountId !== activeAccountId) return;

    const tradeDate = dayjs(t.openTime);
    if (
      tradeDate.isValid() &&
      tradeDate.month() === now.month() &&
      tradeDate.year() === now.year()
    ) {
      if (t.openImageUrl) imagesThisMonth += 1;
      if (t.closeImageUrl) imagesThisMonth += 1;
    }
  });

  return imagesThisMonth < imageLimitPerMonth;
};

// Chart annotation (entry/exit marking) — count this month across the
// active journal. A "chart log" is a trade carrying a chartAnnotatedAt date.
export const countChartLogsThisMonth = (userData) => {
  const user = userData?.value || userData;
  const trades = user?.trades || [];
  const now = dayjs();
  const activeAccountId = getActiveAccountId();
  return trades.filter((t) => {
    const when = t.chartAnnotatedAt || (t.tvChart ? t.updatedAt || t.createdAt : null);
    if (!when) return false;
    if (activeAccountId && t.accountId !== activeAccountId) return false;
    const d = dayjs(when);
    return d.isValid() && d.month() === now.month() && d.year() === now.year();
  }).length;
};

export const canChartLog = (userData) => {
  const rules = getPlanRules(userData);
  const limit = rules.limits.chartLogLimitPerMonth ?? Infinity;
  if (limit === Infinity) return true;
  return countChartLogsThisMonth(userData) < limit;
};

// Trade ids whose chart should be LOCKED (blurred) — for free users who have
// more chart logs this month than their allowance (e.g. after a downgrade).
// The earliest `limit` of the month stay unlocked; the rest are gated.
export const lockedChartTradeIds = (userData) => {
  const rules = getPlanRules(userData);
  const limit = rules.limits.chartLogLimitPerMonth ?? Infinity;
  if (limit === Infinity) return new Set();
  const user = userData?.value || userData;
  const trades = user?.trades || [];
  const now = dayjs();
  const activeAccountId = getActiveAccountId();
  const monthLogs = trades
    .filter((t) => {
      const when = t.chartAnnotatedAt || (t.tvChart ? t.updatedAt || t.createdAt : null);
      if (!when) return false;
      if (activeAccountId && t.accountId !== activeAccountId) return false;
      const d = dayjs(when);
      return d.isValid() && d.month() === now.month() && d.year() === now.year();
    })
    .sort((a, b) => {
      const da = new Date(a.chartAnnotatedAt || a.updatedAt || a.createdAt).getTime();
      const db = new Date(b.chartAnnotatedAt || b.updatedAt || b.createdAt).getTime();
      return da - db;
    });
  return new Set(monthLogs.slice(limit).map((t) => t._id));
};

// Generic feature flag
export const canAccessFeature = (userData, featureKey) => {
  const rules = getPlanRules(userData);
  return rules.features[featureKey] || false;
};

// AI access
export const canUseAI = (userData) => {
  const rules = getPlanRules(userData);
  return rules.features.aiAnalysis;
};

/* -------------------------------------------------------------------------- */
/* 📦 Helpers for IndexedDB                                                    */
/* -------------------------------------------------------------------------- */

export const getCurrentPlanRules = async () => {
  const userData = await getFromIndexedDB("user-data");
  return getPlanRules(userData);
};

export const shouldShowAdsForCurrentUser = async () => {
  const userData = await getFromIndexedDB("user-data");
  return canShowAds(userData);
};
