import Cookies from "js-cookie";
import { getFromIndexedDB } from "./indexedDB"; // assuming this is your helper

// 🟩 Main function to fetch accounts, trades, balances, and plan info
export const fetchAccountsAndTrades = async () => {
  const verified = Cookies.get("isVerified");
  if (verified !== "yes") {
    return { redirectToLogin: true };
  }

  try {
    const cachedUser = await getFromIndexedDB("user-data");
    if (!cachedUser) {
      return { accounts: [], trades: [], userPlan: null };
    }

    const accounts = cachedUser.accounts || [];
    const trades = cachedUser.trades || [];
    const plans = cachedUser.plans || [];
    const subscription = cachedUser.subscription || null;

    // 🟩 Build current balances and trade counts
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

    // 🟩 Build account currency symbols
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

    // 🟩 Extract active user plan info
    let userPlan = null;
    if (subscription?.planId) {
      const matchedPlan =
        plans.find((p) => p.planId === subscription.planId) || null;

      const planName =
        matchedPlan?.name ||
        subscription.planId.charAt(0).toUpperCase() +
          subscription.planId.slice(1);

      userPlan = {
        ...subscription,
        planName,
      };
    }

    return {
      accounts,
      trades,
      currentBalances,
      tradesCount,
      accountSymbols,
      userPlan,
    };
  } catch (err) {
    console.error("Error fetching accounts/trades:", err);
    return {
      accounts: [],
      trades: [],
      currentBalances: {},
      tradesCount: {},
      accountSymbols: {},
      userPlan: null,
    };
  }
};

// 🟩 Separate helper for fetching all plan info (if needed)
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
    console.error("Error fetching plans:", err);
    return [];
  }
};
