const Account = require("../models/Account");
const Trade = require("../models/Trade");
const Plan = require("../models/Plan");
const Order = require("../models/Orders");
const User = require("../models/User");

// 🔹 Utility: Auto-calc subscription status
function computeSubscriptionStatus(user) {
  const now = new Date();

  // No subscription
  if (!user.subscriptionStartAt && !user.subscriptionExpiresAt) {
    return "none";
  }

  // Trial plans
  if (
    user.subscriptionType === "free-trial" ||
    user.subscriptionType === "trial"
  ) {
    return new Date(user.subscriptionExpiresAt) > now ? "trial" : "expired";
  }

  // Lifetime / One-time
  if (
    user.subscriptionType === "lifetime" ||
    user.subscriptionType === "one-time"
  ) {
    return "active";
  }

  // Recurring plans
  if (user.subscriptionType === "recurring") {
    return new Date(user.subscriptionExpiresAt) > now ? "active" : "expired";
  }

  return "none";
}

async function getUserData(user) {
  // 🔹 Auto-update subscription status
  const newStatus = computeSubscriptionStatus(user);

  if (user.subscriptionStatus !== newStatus) {
    await User.findByIdAndUpdate(user._id, { subscriptionStatus: newStatus });
    user.subscriptionStatus = newStatus; // update local object
  }

  // Step 1: Fetch all accounts for this user
  const accounts = await Account.find({ userId: user._id }).lean();

  // Step 2: Extract account IDs
  const accountIds = accounts.map((acc) => acc._id);

  // Step 3: Fetch trades belonging to those accounts
  const trades = await Trade.find({
    userId: user._id,
    accountId: { $in: accountIds },
  }).lean();

  // Step 4: Fetch user orders
  const orders = await Order.find({ userId: user._id })
    .sort({ createdAt: -1 })
    .lean();

  // Step 5: Fetch active plans
  const plans = await Plan.find({ status: "active" }).lean();

  // Step 6: Structure response
  return {
    userId: user._id,
    name: user.name,
    email: user.email,

    subscription: {
      planId: user.subscriptionPlan,
      status: user.subscriptionStatus,
      type: user.subscriptionType,
      startAt: user.subscriptionStartAt,
      expiresAt: user.subscriptionExpiresAt,
      createdAt: user.subscriptionCreatedAt,
    },

    accounts,
    trades,
    orders,
    plans,
  };
}

module.exports = getUserData;
