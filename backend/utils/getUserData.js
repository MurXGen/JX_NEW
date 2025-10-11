const Account = require("../models/Account");
const Trade = require("../models/Trade");
const Plan = require("../models/Plan");

async function getUserData(user) {
  // Fetch accounts & trades for the user
  const accounts = await Account.find({ userId: user._id }).lean();
  const trades = await Trade.find({ userId: user._id }).lean();

  // Fetch all plans (or active plans if needed)
  const plans = await Plan.find({}).lean();

  // Return structured userData
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
    plans,
  };
}

module.exports = getUserData;
