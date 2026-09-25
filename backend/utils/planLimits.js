"use strict";

/* Server-side plan limits — a safety cap so the monthly trade limit can't be
   bypassed via the API. Mirrors the frontend PLAN_RULES. */

const Trade = require("../models/Trade");

const FREE_TRADE_CAP = 20; // trades / month on Free (quick + detailed combined)

function isPro(user) {
  return (
    ["pro", "lifetime"].includes(user?.subscriptionPlan) &&
    ["active", "none"].includes(user?.subscriptionStatus || "active") &&
    (!user?.subscriptionExpiresAt || new Date(user.subscriptionExpiresAt) > new Date())
  );
}

/* count trades created this calendar month for the user's active journal */
async function tradesThisMonth(userId, accountId) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const q = { userId, createdAt: { $gte: start, $lt: end } };
  if (accountId) q.accountId = accountId;
  return Trade.countDocuments(q);
}

/* remaining free slots this month (Infinity for Pro/Lifetime) */
async function freeTradesRemaining(user, accountId) {
  if (isPro(user)) return Infinity;
  const used = await tradesThisMonth(user._id, accountId);
  return Math.max(0, FREE_TRADE_CAP - used);
}

module.exports = { FREE_TRADE_CAP, isPro, tradesThisMonth, freeTradesRemaining };
