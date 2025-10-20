import Cookies from "js-cookie";
import { getFromIndexedDB } from "./indexedDB"; // assuming this is your helper

export const fetchAccountsAndTrades = async () => {
  const verified = Cookies.get("isVerified");
  if (verified !== "yes") {
    return { redirectToLogin: true };
  }

  try {
    const cachedUser = await getFromIndexedDB("user-data");

    if (!cachedUser?.accounts?.length) {
      return { accounts: [], trades: [] };
    }

    const accounts = cachedUser.accounts;
    const trades = cachedUser.trades || [];

    // Build balance and trades count maps
    const currentBalances = {};
    const tradesCount = {};
    accounts.forEach((acc) => {
      const starting = acc.startingBalance?.amount || 0;
      const tradesForAcc = trades.filter((t) => t.accountId === acc._id);
      const pnlSum = tradesForAcc.reduce(
        (sum, t) => sum + (Number(t.pnl) || 0),
        0
      );

      currentBalances[acc.name] = starting + pnlSum;
      tradesCount[acc.name] = tradesForAcc.length;
    });

    // Build currency symbols
    const accountSymbols = {};
    accounts.forEach((acc) => {
      switch ((acc.currency || "").toUpperCase()) {
        case "USD":
          accountSymbols[acc.name] = "$";
          break;
        case "INR":
          accountSymbols[acc.name] = "₹";
          break;
        case "USDT":
          accountSymbols[acc.name] = "₮";
          break;
        default:
          accountSymbols[acc.name] = "¤";
      }
    });

    return { accounts, trades, currentBalances, tradesCount, accountSymbols };
  } catch (err) {
    return {
      accounts: [],
      trades: [],
      currentBalances: {},
      tradesCount: {},
      accountSymbols: {},
    };
  }
};

export const fetchPlansFromIndexedDB = async () => {
  try {
    const plans = await getFromIndexedDB("plans");
    if (!plans || !Array.isArray(plans)) return [];

    return plans.map((plan) => ({
      planId: plan.planId,
      name: plan.name,
      monthly: plan.monthly,
      yearly: plan.yearly,
    }));
  } catch (err) {
    return [];
  }
};
