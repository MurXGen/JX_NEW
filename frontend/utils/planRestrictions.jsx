import dayjs from "dayjs";
import Cookies from "js-cookie";
import { getFromIndexedDB } from "./indexedDB";

// 🧩 Local Fallback Rules
export const PLAN_RULES = {
  free: {
    limits: {
      tradeLimitPerMonth: 10,
      quickTradeLimitPerMonth: 10,
      accountLimit: 1,
      imageLimitPerMonth: 10,
      maxImageSizeMB: 10,
    },
    features: {
      logTrades: "Up to 10 trades per month",
      multipleAccounts: "Up to 1 account",
      showsAds: true,
      imageUpload: "Up to 10 images per month",
      maxImageSize: "10 MB",
      shareTrades: false,
      aiAnalysis: false,
      advancedCharts: true,
      quickTradeLog: "Up to 10 quick trades",
      multipleEntries: true,
      backupData: false,
      integration: false,
      exportTrades: false, // ⬅️ NEW: Export feature access flag
    },
  },
  pro: {
    limits: {
      tradeLimitPerMonth: Infinity,
      quickTradeLimitPerMonth: Infinity,
      accountLimit: 3,
      imageLimitPerMonth: Infinity,
      maxImageSizeMB: 100,
    },
    features: {
      logTrades: "Unlimited",
      multipleAccounts: "Up to 3 (contact for more)",
      showsAds: false,
      imageUpload: "Unlimited",
      maxImageSize: "100 MB (contact for increase)",
      shareTrades: true,
      aiAnalysis: true,
      advancedCharts: true,
      quickTradeLog: "Unlimited",
      multipleEntries: true,
      backupData: true,
      integration: true,
      exportTrades: true, // ⬅️ Pro & Master can export
    },
  },
  master: {
    limits: {
      tradeLimitPerMonth: Infinity,
      quickTradeLimitPerMonth: Infinity,
      accountLimit: 3,
      imageLimitPerMonth: Infinity,
      maxImageSizeMB: 100,
    },
    features: {
      logTrades: "Unlimited",
      multipleAccounts: "Up to 3 (contact for more)",
      showsAds: false,
      imageUpload: "Unlimited",
      maxImageSize: "100 MB (contact for increase)",
      shareTrades: true,
      aiAnalysis: true,
      advancedCharts: true,
      quickTradeLog: "Unlimited",
      multipleEntries: true,
      backupData: true,
      integration: true,
      exportTrades: true, // ⬅️ Pro & Master can export
    },
  },
};

// 🧭 Normalize plan names and retrieve rules
export const getPlanRules = (userData) => {
  const planId =
    userData?.subscription?.planId ||
    userData?.subscription?.planName ||
    "free";
  const planName = String(planId).toLowerCase();
  return PLAN_RULES[planName] || PLAN_RULES.free;
};

// ✅ Determine if ads should be shown
export const canShowAds = (userData) => {
  const rules = getPlanRules(userData);
  return rules.features.showsAds;
};

// ✅ Active account ID from cookies
const getActiveAccountId = () => Cookies.get("accountId");

// ✅ Check if user can add a normal trade
export const canAddTrade = async (userData, tradeStatus = "closed") => {
  const rules = getPlanRules(userData);
  const tradeLimit =
    tradeStatus === "running"
      ? rules.limits.quickTradeLimitPerMonth
      : rules.limits.tradeLimitPerMonth;

  if (tradeLimit === Infinity) return true;

  const trades = userData.trades || [];
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
      if (tradeStatus === "running") {
        return t.status === "running";
      } else {
        return t.status === "closed";
      }
    }
    return false;
  }).length;

  return tradesThisMonth < tradeLimit;
};

// ✅ Check if user can add an account
export const canAddAccount = (userData, accountCount) => {
  const rules = getPlanRules(userData);
  return accountCount < rules.limits.accountLimit;
};

// ✅ Check if image upload is allowed
export const canUploadImage = async (userData, newImageSizeMB) => {
  const rules = getPlanRules(userData);
  const { maxImageSizeMB, imageLimitPerMonth } = rules.limits;

  if (newImageSizeMB > maxImageSizeMB) return false;
  if (imageLimitPerMonth === Infinity) return true;

  const trades = userData.trades || [];
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

// ✅ Generic feature access
export const canAccessFeature = (userData, featureKey) => {
  const rules = getPlanRules(userData);
  return rules.features[featureKey] || false;
};

// ✅ Check AI access
export const canUseAI = (userData) => {
  const rules = getPlanRules(userData);
  return rules.features.aiAnalysis;
};

// ✅ Helpers for current user
export const getCurrentPlanRules = async () => {
  const userData = await getFromIndexedDB("user-data");
  return getPlanRules(userData);
};

export const shouldShowAdsForCurrentUser = async () => {
  const userData = await getFromIndexedDB("user-data");
  return canShowAds(userData);
};
