import { getFromIndexedDB } from "./indexedDB"; // adjust path if needed

// 🧾 Plan Rules Definition
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

// 🧩 Helper: Get plan rules from userData
export const getPlanRules = (userData) => {
  const planName =
    userData?.subscription?.planId ||
    userData?.subscription?.planName ||
    "Free";
  return PLAN_RULES[planName] || PLAN_RULES.Free;
};

// ✅ Check if user can add a trade
export const canAddTrade = (userData, tradesCountThisMonth) => {
  const rules = getPlanRules(userData);
  return tradesCountThisMonth < rules.tradeLimitPerMonth;
};

// ✅ Check if user can add an account
export const canAddAccount = (userData, accountCount) => {
  const rules = getPlanRules(userData);
  return accountCount <= rules.accountLimit;
};

// ✅ Check image upload eligibility
export const canUploadImage = (
  userData,
  uploadedImagesThisMonth,
  fileSizeMB
) => {
  const rules = getPlanRules(userData);
  if (!rules.canUploadImages) return false;
  if (fileSizeMB > rules.maxImageSizeMB) return false;
  if (uploadedImagesThisMonth >= rules.imageLimitPerMonth) return false;
  return true;
};

// ✅ Check feature access (generic)
export const canAccessFeature = (userData, feature) => {
  const rules = getPlanRules(userData);
  return rules[`canAccess${feature}`] || false;
};

// ✅ Get trade history limit (in days)
export const getTradeHistoryLimit = (userData) => {
  const rules = getPlanRules(userData);
  return rules.tradeHistoryDays;
};

// ✅ Wrapper: Get rules directly from IndexedDB
export const getCurrentPlanRules = async () => {
  const userData = await getFromIndexedDB("user-data");
  return getPlanRules(userData);
};
