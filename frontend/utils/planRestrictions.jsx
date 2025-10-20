import { getFromIndexedDB } from "./indexedDB";
import dayjs from "dayjs";

const PLAN_RULES = {
  Free: {
    tradeLimitPerMonth: 10,
    accountLimit: 1,
    imageLimitPerMonth: 5,
    maxImageSizeMB: 5,
    tradeHistoryDays: 30,
    aiPrompts: 0,
    canUploadImages: true,
    canAccessFinancialNews: false,
    canAccessTelegramBot: false,
    canExportTrades: false,
    canShareTrades: false,
  },
  Pro: {
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
    canShareTrades: false,
  },
  Elite: {
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
    canShareTrades: false,
  },
  Master: {
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
  },
};

// Get plan rules
export const getPlanRules = (userData) => {
  const planName =
    userData?.subscription?.planId ||
    userData?.subscription?.planName ||
    "Free";
  console.log("[DEBUG] User plan:", planName);
  return PLAN_RULES[planName] || PLAN_RULES.Free;
};

// Check if user can add a trade
export const canAddTrade = async (userData) => {
  const rules = getPlanRules(userData);
  if (rules.tradeLimitPerMonth === Infinity) return true;

  const trades = userData.trades || [];
  const now = dayjs();

  const tradesThisMonth = trades.filter((t) => {
    if (!t.openTime) return false;
    const tradeDate = dayjs(t.openTime);
    const valid =
      tradeDate.isValid() &&
      tradeDate.month() === now.month() &&
      tradeDate.year() === now.year();
    console.log("[DEBUG] Trade date:", t.openTime, "Valid this month?", valid);
    return valid;
  }).length;

  console.log(
    "[DEBUG] Trades this month:",
    tradesThisMonth,
    "Limit:",
    rules.tradeLimitPerMonth
  );
  return tradesThisMonth < rules.tradeLimitPerMonth;
};

// Check if user can add an account
export const canAddAccount = (userData, accountCount) => {
  const rules = getPlanRules(userData);
  console.log("[DEBUG] Accounts:", accountCount, "Limit:", rules.accountLimit);
  return accountCount < rules.accountLimit;
};

// Check image upload eligibility
export const canUploadImage = async (userData, newImageSizeMB) => {
  const rules = getPlanRules(userData);
  console.log(
    "[DEBUG] New image size:",
    newImageSizeMB,
    "Max allowed:",
    rules.maxImageSizeMB
  );
  if (!rules.canUploadImages) return false;
  if (newImageSizeMB > rules.maxImageSizeMB) return false;
  if (rules.imageLimitPerMonth === Infinity) return true;

  const trades = userData.trades || [];
  let imagesThisMonth = 0;
  const now = dayjs();

  trades.forEach((trade) => {
    if (!trade.openTime) return;
    const tradeDate = dayjs(trade.openTime);
    if (
      tradeDate.isValid() &&
      tradeDate.month() === now.month() &&
      tradeDate.year() === now.year()
    ) {
      if (trade.openImageUrl) imagesThisMonth += 1;
      if (trade.closeImageUrl) imagesThisMonth += 1;
    }
  });

  console.log(
    "[DEBUG] Images this month:",
    imagesThisMonth,
    "Limit:",
    rules.imageLimitPerMonth
  );
  return imagesThisMonth < rules.imageLimitPerMonth;
};

// Generic feature access
export const canAccessFeature = (userData, feature) => {
  const rules = getPlanRules(userData);
  return rules[`canAccess${feature}`] || false;
};

// Trade history limit
export const getTradeHistoryLimit = (userData) => {
  const rules = getPlanRules(userData);
  return rules.tradeHistoryDays;
};

// Wrapper: get rules from IndexedDB
export const getCurrentPlanRules = async () => {
  const userData = await getFromIndexedDB("user-data");
  return getPlanRules(userData);
};
