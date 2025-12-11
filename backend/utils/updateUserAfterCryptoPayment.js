module.exports.updateUserAfterCryptoPayment = async (user, order) => {
  if (!user || !order) {
    return user;
  }

  // Lifetime detection
  const isLifetime =
    order.period === "lifetime" || order.meta?.isLifetime === true;

  // ----------------------------------------------------
  // COMPUTE EXPIRY
  // ----------------------------------------------------
  let expiresAt = null;

  if (isLifetime) {
    user.subscriptionPlan = "lifetime";
    user.subscriptionType = "lifetime";
    user.subscriptionExpiresAt = null;

    user.markModified("subscriptionPlan");
    user.markModified("subscriptionType");
    user.markModified("subscriptionExpiresAt");
  } else {
    const now = new Date();
    expiresAt = new Date(now);

    if (order.period === "monthly") {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    if (order.period === "yearly") {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    user.subscriptionPlan = "pro";
    user.subscriptionType = "one-time";
    user.subscriptionExpiresAt = expiresAt;

    user.markModified("subscriptionPlan");
    user.markModified("subscriptionType");
    user.markModified("subscriptionExpiresAt");
  }

  // COMMON FIELDS
  user.subscriptionStatus = "active";
  user.subscriptionStartAt = new Date();
  user.subscriptionCreatedAt = new Date();
  user.lastBillingDate = null;
  user.nextBillingDate = null;

  user.markModified("subscriptionStatus");
  user.markModified("subscriptionStartAt");
  user.markModified("subscriptionCreatedAt");
  user.markModified("lastBillingDate");
  user.markModified("nextBillingDate");

  // ----------------------------------------------------
  // UPDATE USER ORDERS
  // ----------------------------------------------------
  user.orders = user.orders.map((o) => {
    const userOrderId = String(o.orderId || o._id || "");
    const incomingId = String(order._id);

    if (userOrderId === incomingId) {
      return {
        ...(o.toObject?.() ?? o),
        status: "paid",
        updatedAt: new Date(),
      };
    }

    return o;
  });

  user.markModified("orders");

  return user;
};
