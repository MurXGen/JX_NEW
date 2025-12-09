const Account = require("../models/Account");
const Trade = require("../models/Trade");
const Plan = require("../models/Plan");
const Order = require("../models/Orders");
const User = require("../models/User");

// ---------------------------------------------------------------
// 🔹 Compute correct subscription status
// ---------------------------------------------------------------
function computeSubscriptionStatus(user) {
  const now = new Date();

  // Lifetime plan
  if (user.subscriptionPlan === "lifetime") {
    return "active";
  }

  // No subscription ever
  if (!user.subscriptionStartAt && !user.subscriptionExpiresAt) {
    return "none";
  }

  // One-time pro plans (monthly/yearly from crypto)
  if (user.subscriptionType === "one-time") {
    if (!user.subscriptionExpiresAt) return "active";
    return new Date(user.subscriptionExpiresAt) > now ? "active" : "expired";
  }

  // Recurring plans
  if (user.subscriptionType === "recurring") {
    if (!user.subscriptionExpiresAt) return "active";
    return new Date(user.subscriptionExpiresAt) > now ? "active" : "expired";
  }

  return "none";
}

// ---------------------------------------------------------------
// 🔹 Load everything for logged-in user
// ---------------------------------------------------------------
async function getUserData(user) {
  // Compute fresh status
  const newStatus = computeSubscriptionStatus(user);

  // Update DB ONLY IF status is actually different
  if (user.subscriptionStatus !== newStatus) {
    await User.findByIdAndUpdate(user._id, {
      subscriptionStatus: newStatus,
    });

    user.subscriptionStatus = newStatus; // update local object too
  }

  // 1️⃣ Fetch accounts
  const accounts = await Account.find({ userId: user._id }).lean();

  // 2️⃣ Account IDs
  const accountIds = accounts.map((acc) => acc._id);

  // 3️⃣ Fetch trades
  const trades = await Trade.find({
    userId: user._id,
    accountId: { $in: accountIds },
  }).lean();

  // 4️⃣ Fetch user orders
  const orders = await Order.find({ userId: user._id })
    .sort({ createdAt: -1 })
    .lean();

  // 5️⃣ Active plans
  const plans = await Plan.find({ status: "active" }).lean();

  // 6️⃣ FINAL RETURN — DO NOT ALTER USER FIELDS
  return {
    userId: user._id,
    name: user.name,
    email: user.email,

    subscription: {
      plan: user.subscriptionPlan,
      status: user.subscriptionStatus,
      type: user.subscriptionType,
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
