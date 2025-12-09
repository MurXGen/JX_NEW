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
      accountLimit: 1,
      imageLimitPerMonth: 10,
      maxImageSizeMB: 5,
    },
    features: {
      logTrades: "Up to 10 trades monthly",
      multipleAccounts: "1 account",
      showsAds: true,
      imageUpload: "10 images/month",
      maxImageSize: "5 MB",
      shareTrades: false,
      aiAnalysis: false,
      advancedCharts: false,
      quickTradeLog: "10 quick trades",
      multipleEntries: false,
      backupData: false,
      integration: false,
      exportTrades: false,
    },
  },

  pro: {
    limits: {
      tradeLimitPerMonth: Infinity,
      quickTradeLimitPerMonth: Infinity,
      accountLimit: 3,
      imageLimitPerMonth: Infinity,
      maxImageSizeMB: 50,
    },
    features: {
      logTrades: "Unlimited",
      multipleAccounts: "Up to 3 accounts",
      showsAds: false,
      imageUpload: "Unlimited",
      maxImageSize: "50 MB",
      shareTrades: true,
      aiAnalysis: true,
      advancedCharts: true,
      quickTradeLog: "Unlimited",
      multipleEntries: true,
      backupData: true,
      integration: true,
      exportTrades: true,
    },
  },

  lifetime: {
    limits: {
      tradeLimitPerMonth: Infinity,
      quickTradeLimitPerMonth: Infinity,
      accountLimit: 10,
      imageLimitPerMonth: Infinity,
      maxImageSizeMB: 100,
    },
    features: {
      logTrades: "Unlimited",
      multipleAccounts: "Up to 10 accounts",
      showsAds: false,
      imageUpload: "Unlimited",
      maxImageSize: "100 MB",
      shareTrades: true,
      aiAnalysis: true,
      advancedCharts: true,
      quickTradeLog: "Unlimited",
      multipleEntries: true,
      backupData: true,
      integration: true,
      exportTrades: true,
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
