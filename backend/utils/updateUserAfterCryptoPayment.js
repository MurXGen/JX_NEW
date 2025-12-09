// utils/updateUserAfterCryptoPayment.js

module.exports.updateUserAfterCryptoPayment = async (user, order) => {
  if (!user || !order) return;

  const now = new Date();

  // 🔹 Determine plan type based on period
  const planMap = {
    monthly: "pro",
    yearly: "pro",
    lifetime: "lifetime",
  };

  const planType = planMap[order.period] || "pro";

  // 🔹 CRYPTO ARE ALWAYS ONE-TIME
  const subscriptionType = "one-time";

  // 🔹 Calculate expiry only for monthly/yearly
  let expiresAt = null;

  if (order.period === "monthly") {
    expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);
  }

  if (order.period === "yearly") {
    expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  }

  // ---------------------------------------------------------------------
  // 🔥 Update User DB
  // ---------------------------------------------------------------------

  user.subscriptionPlan = planType;
  user.subscriptionStatus = "active";
  user.subscriptionType = "one-time"; // crypto always

  user.subscriptionStartAt = new Date();
  user.subscriptionExpiresAt = expiresAt;
  user.subscriptionCreatedAt = new Date();

  // 🔹 Recurring billing fields MUST NOT exist for crypto
  user.lastBillingDate = null;
  user.nextBillingDate = null;

  // 🔹 Update order status
  user.orders = user.orders.map((o) =>
    String(o.orderId) === String(order._id)
      ? { ...o.toObject(), status: "paid" }
      : o
  );

  return user;
};
