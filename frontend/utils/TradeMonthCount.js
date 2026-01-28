import dayjs from "dayjs";
import Cookies from "js-cookie";
import { getFromIndexedDB } from "@/utils/indexedDB";
import { getPlanRules } from "@/utils/planRestrictions";

const getActiveAccountId = () => Cookies.get("accountId");

export const getTradesThisMonth = (trades = [], tradeStatus) => {
  const now = dayjs();
  const activeAccountId = getActiveAccountId();

  return trades.filter((t) => {
    if (!t.openTime) return false;
    if (activeAccountId && t.accountId !== activeAccountId) return false;

    const tradeDate = dayjs(t.openTime);
    if (tradeDate.month() !== now.month() || tradeDate.year() !== now.year()) {
      return false;
    }

    // quick vs normal trade
    if (tradeStatus === "quick") return t.tradeStatus === "quick";
    return t.tradeStatus !== "quick";
  }).length;
};

const extractTradesFromUserData = (userData) => {
  if (!userData) return [];

  // IndexedDB shape
  if (Array.isArray(userData?.value?.trades)) {
    return userData.value.trades;
  }

  // Fallback (API-shaped data)
  if (Array.isArray(userData?.trades)) {
    return userData.trades;
  }

  return [];
};

export const getImagesThisMonth = (trades = []) => {
  const now = dayjs();
  const activeAccountId = getActiveAccountId();

  let count = 0;

  trades.forEach((t) => {
    if (!t.openTime) return;
    if (activeAccountId && t.accountId !== activeAccountId) return;

    const tradeDate = dayjs(t.openTime);
    if (tradeDate.month() !== now.month() || tradeDate.year() !== now.year()) {
      return;
    }

    if (t.openImageUrl) count += 1;
    if (t.closeImageUrl) count += 1;
  });

  return count;
};

export const canUploadImageThisMonth = async () => {
  try {
    const userData = await getFromIndexedDB("user-data");

    const rules = getPlanRules(userData);
    const imageLimit = rules.limits.imageLimitPerMonth;

    if (imageLimit === Infinity) return true;

    const trades = extractTradesFromUserData(userData);
    const imagesThisMonth = getImagesThisMonth(trades);

    return imagesThisMonth < imageLimit;
  } catch {
    // fail-open to avoid blocking user on unexpected errors
    return true;
  }
};

export const canSubmitTrade = async (tradeStatus = "normal") => {
  try {
    const userData = await getFromIndexedDB("user-data");

    const rules = getPlanRules(userData);
    const trades = extractTradesFromUserData(userData);

    const limit =
      tradeStatus === "quick"
        ? rules.limits.quickTradeLimitPerMonth
        : rules.limits.tradeLimitPerMonth;

    if (limit === Infinity) return true;

    const now = dayjs();
    const accountId = Cookies.get("accountId");

    const tradesThisMonth = trades.filter((t) => {
      if (!t.openTime) return false;
      if (accountId && t.accountId !== accountId) return false;

      const tradeDate = dayjs(t.openTime);
      if (!tradeDate.isValid()) return false;

      if (
        tradeDate.month() !== now.month() ||
        tradeDate.year() !== now.year()
      ) {
        return false;
      }

      if (tradeStatus === "quick") {
        return t.tradeStatus === "quick";
      }

      return t.tradeStatus !== "quick";
    }).length;

    return tradesThisMonth < limit;
  } catch {
    // fail-open to prevent accidental blocking
    return true;
  }
};

export const filterTradesByHistoryLimit = (trades, userData) => {
  if (!Array.isArray(trades)) return [];

  const rules = getPlanRules(userData);
  const historyDays = rules?.limits?.historyDays;

  // Unlimited history (Pro / Lifetime)
  if (!historyDays || historyDays === Infinity) {
    return trades;
  }

  const cutoffDate = dayjs().subtract(historyDays, "day");

  return trades.filter((trade) => {
    if (!trade.openTime) return false;
    return dayjs(trade.openTime).isAfter(cutoffDate);
  });
};
