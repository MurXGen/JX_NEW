const Account = require("../models/Account");
const Trade = require("../models/Trade");
const Plan = require("../models/Plan");
const Order = require("../models/Orders");

async function getUserData(user) {
  // Step 1: Fetch all accounts belonging to this user
  const accounts = await Account.find({ userId: user._id }).lean();

  // Step 2: Extract the accountIds for filtering trades
  const accountIds = accounts.map((acc) => acc._id);

  // Step 3: Fetch trades only for those accounts
  const trades = await Trade.find({
    userId: user._id,
    accountId: { $in: accountIds }, // ✅ Only include trades linked to user’s accounts
  }).lean();

  // Step 4: Fetch orders for this user
  const orders = await Order.find({ userId: user._id })
    .sort({ createdAt: -1 })
    .lean();

  // Step 5: Fetch all active plans
  const plans = await Plan.find({ status: "active" }).lean();

  // Step 6: Structure the response
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
