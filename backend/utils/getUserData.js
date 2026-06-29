const Account = require("../models/Account");
const Trade = require("../models/Trade");
const Plan = require("../models/Plan");
const Order = require("../models/Orders");
const User = require("../models/User");

// ---------------------------------------------------------------
// 🔹 Reconcile the subscription at read time.
//    Returns the CORRECT { plan, type, status } — and crucially DOWNGRADES a
//    non-lifetime plan to free once it has expired or been canceled, so access
//    actually drops (not just a stale "pro/expired").
// ---------------------------------------------------------------
function reconcileSubscription(user) {
  const now = new Date();

  // Lifetime is permanent.
  if (user.subscriptionPlan === "lifetime") {
    return { plan: "lifetime", type: "lifetime", status: "active" };
  }

  const exp = user.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt) : null;

  // Never subscribed.
  if (!user.subscriptionStartAt && !exp && (user.subscriptionPlan || "free") === "free") {
    return { plan: "free", type: "none", status: "none" };
  }

  // Lapsed (expiry passed) OR explicitly canceled → downgrade to free.
  if ((exp && exp.getTime() <= now.getTime()) || user.subscriptionStatus === "canceled") {
    return { plan: "free", type: "none", status: "expired" };
  }

  // Active: within the paid period (or no expiry recorded, e.g. lifetime-like).
  if (user.subscriptionPlan && user.subscriptionPlan !== "free") {
    return { plan: user.subscriptionPlan, type: user.subscriptionType || "recurring", status: "active" };
  }

  return { plan: "free", type: "none", status: "none" };
}

// ---------------------------------------------------------------
// 🔹 Load everything for logged-in user
// ---------------------------------------------------------------
async function getUserData(user) {
  // Reconcile plan + type + status (handles expiry/cancellation downgrades).
  const recon = reconcileSubscription(user);
  const changed =
    user.subscriptionPlan !== recon.plan ||
    user.subscriptionType !== recon.type ||
    user.subscriptionStatus !== recon.status;

  if (changed) {
    await User.findByIdAndUpdate(user._id, {
      subscriptionPlan: recon.plan,
      subscriptionType: recon.type,
      subscriptionStatus: recon.status,
    });
    user.subscriptionPlan = recon.plan;
    user.subscriptionType = recon.type;
    user.subscriptionStatus = recon.status;
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
      source: user.subscriptionSource,
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
