import dayjs from "dayjs";
import Cookies from "js-cookie"; // for active account
import { getFromIndexedDB } from "./indexedDB";

const PLAN_RULES = {
  free: {
    tradeLimitPerMonth: 10,
    accountLimit: 1,
    imageLimitPerMonth: 5,
    maxImageSizeMB: 5,
    tradeHistoryDays: 30,
    aiPrompts: 0,
    canUploadImages: true,
    canAccessFinancialNews: false,
    canAccessTelegramBot: false,
    canExportTrades: true,
    canShareTrades: true,
    showAds: true, // show ads for free users
  },
  pro: {
    tradeLimitPerMonth: Infinity,
    accountLimit: 2,
    imageLimitPerMonth: 60,
    maxImageSizeMB: 10,
    tradeHistoryDays: 90,
    aiPrompts: 5,
    canUploadImages: true,
    canAccessFinancialNews: false,
    canAccessTelegramBot: false,
    canExportTrades: true,
    canShareTrades: true,
    showAds: true,
  },
  elite: {
    tradeLimitPerMonth: Infinity,
    accountLimit: 3,
    imageLimitPerMonth: Infinity,
    maxImageSizeMB: 10,
    tradeHistoryDays: Infinity,
    aiPrompts: Infinity,
    canUploadImages: true,
    canAccessFinancialNews: true,
    canAccessTelegramBot: true,
    canExportTrades: true,
    canShareTrades: true,
    showAds: false,
  },
  master: {
    tradeLimitPerMonth: Infinity,
    accountLimit: 5,
    imageLimitPerMonth: Infinity,
    maxImageSizeMB: 10,
    tradeHistoryDays: Infinity,
    aiPrompts: Infinity,
    canUploadImages: true,
    canAccessFinancialNews: true,
    canAccessTelegramBot: true,
    canExportTrades: true,
    canShareTrades: true,
    showAds: false,
  },
};

// Check if ads should be shown for given user
export const canShowAds = (userData) => {
  const rules = getPlanRules(userData);
  return Boolean(rules.showAds);
};

// Normalize plan names
export const getPlanRules = (userData) => {
  const planId =
    userData?.subscription?.planId ||
    userData?.subscription?.planName ||
    "free";
  const planName = String(planId).toLowerCase();
  return PLAN_RULES[planName] || PLAN_RULES.free;
};

// Get active accountId from cookies
const getActiveAccountId = () => Cookies.get("accountId");

// ✅ Check if user can add a trade for active account
export const canAddTrade = async (userData) => {
  const rules = getPlanRules(userData);
  if (rules.tradeLimitPerMonth === Infinity) return true;

  const trades = userData.trades || [];
  const now = dayjs();
  const activeAccountId = getActiveAccountId();

  const tradesThisMonth = trades.filter((t) => {
    if (!t.openTime) return false;
    if (activeAccountId && t.accountId !== activeAccountId) return false;

    const tradeDate = dayjs(t.openTime);
    return (
      tradeDate.isValid() &&
      tradeDate.month() === now.month() &&
      tradeDate.year() === now.year()
    );
  }).length;

  return tradesThisMonth < rules.tradeLimitPerMonth;
};

// ✅ Check if user can add an account (global)
export const canAddAccount = (userData, accountCount) => {
  const rules = getPlanRules(userData);
  return accountCount < rules.accountLimit;
};

// ✅ Check image upload eligibility for active account
export const canUploadImage = async (userData, newImageSizeMB) => {
  const rules = getPlanRules(userData);
  if (!rules.canUploadImages) return false;
  if (newImageSizeMB > rules.maxImageSizeMB) return false;
  if (rules.imageLimitPerMonth === Infinity) return true;

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

  return imagesThisMonth < rules.imageLimitPerMonth;
};

// ✅ Generic feature access
export const canAccessFeature = (userData, feature) => {
  const rules = getPlanRules(userData);
  return rules[`canAccess${feature}`] || false;
};

// ✅ Trade history limit
export const getTradeHistoryLimit = (userData) => {
  const rules = getPlanRules(userData);
  return rules.tradeHistoryDays;
};

export const getCurrentPlanRules = async () => {
  const userData = await getFromIndexedDB("user-data");
  return getPlanRules(userData);
};

// If you need an async wrapper to check ads for the currently cached user
export const shouldShowAdsForCurrentUser = async () => {
  const userData = await getFromIndexedDB("user-data");
  return canShowAds(userData);
};
