const Account = require("../models/Account");
const Trade = require("../models/Trade");
const Plan = require("../models/Plan");
const Order = require("../models/Orders");
const User = require("../models/User");

// ---------------------------------------------------------------
// 🔹 Compute subscription status based on NEW USER MODEL
// ---------------------------------------------------------------
function computeSubscriptionStatus(user) {
  const now = new Date();

  // No subscription ever created
  if (!user.subscriptionStartAt && !user.subscriptionExpiresAt) {
    return "none";
  }

  // Lifetime plan is always active
  if (
    user.subscriptionType === "one-time" &&
    user.subscriptionPlan === "lifetime"
  ) {
    return "active";
  }

  // One-time non-lifetime purchases (rare but supported)
  if (user.subscriptionType === "one-time") {
    return "active";
  }

  // Recurring plans
  if (user.subscriptionType === "recurring") {
    return new Date(user.subscriptionExpiresAt) > now ? "active" : "expired";
  }

  // Default fallback
  return "none";
}

// ---------------------------------------------------------------
// 🔹 Load everything for logged-in user
// ---------------------------------------------------------------
async function getUserData(user) {
  // Auto-update subscription state
  const newStatus = computeSubscriptionStatus(user);

  if (user.subscriptionStatus !== newStatus) {
    await User.findByIdAndUpdate(user._id, { subscriptionStatus: newStatus });
    user.subscriptionStatus = newStatus;
  }

  // 1️⃣ Fetch accounts
  const accounts = await Account.find({ userId: user._id }).lean();

  // 2️⃣ Extract account IDs
  const accountIds = accounts.map((acc) => acc._id);

  // 3️⃣ Fetch trades for those accounts
  const trades = await Trade.find({
    userId: user._id,
    accountId: { $in: accountIds },
  }).lean();

  // 4️⃣ Fetch user's orders
  const orders = await Order.find({ userId: user._id })
    .sort({ createdAt: -1 })
    .lean();

  // 5️⃣ Active plans (pro, lifetime)
  const plans = await Plan.find({ status: "active" }).lean();

  // 6️⃣ FINAL STRUCTURED RESPONSE
  return {
    userId: user._id,
    name: user.name,
    email: user.email,

    subscription: {
      plan: user.subscriptionPlan, // "free", "pro", "lifetime"
      status: user.subscriptionStatus, // "active", "expired", "canceled", "none"
      type: user.subscriptionType, // "recurring", "one-time", "none"
      startAt: user.subscriptionStartAt,
      expiresAt: user.subscriptionExpiresAt,
      createdAt: user.subscriptionCreatedAt,
      paddleCustomerId: user.paddleCustomerId,
      lastBillingDate: user.lastBillingDate,
      nextBillingDate: user.nextBillingDate,
    },

    accounts,
    trades,
    orders,
    plans,
  };
}

module.exports = getUserData;
