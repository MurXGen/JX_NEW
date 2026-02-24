import dayjs from "dayjs";
import Cookies from "js-cookie";
import { getFromIndexedDB } from "./indexedDB";

/* -------------------------------------------------------------------------- */
/* 🛠️ PLAN RULES (Corrected to match backend)                                   */
/* -------------------------------------------------------------------------- */

export const PLAN_RULES = {
  free: {
    limits: {
      tradeLimitPerMonth: 10,
      quickTradeLimitPerMonth: 10,
      accountLimit: 1, // 1 journal
      imageLimitPerMonth: 10,
      maxImageSizeMB: 10,
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
      imageLimitPerMonth: Infinity,
      // maxImageSizeMB: 25,
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
      imageLimitPerMonth: Infinity,
      maxImageSizeMB: 50,
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
