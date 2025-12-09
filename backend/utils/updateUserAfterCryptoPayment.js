module.exports.updateUserAfterCryptoPayment = async (user, order) => {
  if (!user || !order) {
    console.log("❌ Missing user or order in updateUserAfterCryptoPayment");
    return user;
  }

  console.log("🚀 Running updateUserAfterCryptoPayment");
  console.log("🔹 Incoming order:", {
    period: order.period,
    meta: order.meta,
    planId: order.planId,
    orderId: order._id,
  });

  const isLifetime =
    order.period === "lifetime" ||
    order.meta?.isLifetime ||
    order.planId?.toLowerCase().includes("lifetime");

  console.log("🔍 isLifetime computed as:", isLifetime);

  // ----------------------------------------------------
  // COMPUTE EXPIRY
  // ----------------------------------------------------
  let expiresAt = null;

  if (isLifetime) {
    console.log("🎉 Applying LIFETIME subscription…");

    user.subscriptionPlan = "lifetime";
    user.subscriptionType = "lifetime";
    user.subscriptionExpiresAt = null;

    // mark modified
    user.markModified("subscriptionPlan");
    user.markModified("subscriptionType");
    user.markModified("subscriptionExpiresAt");
  } else {
    console.log("📅 Applying recurring term:", order.period);

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

  // force marking these too
  user.markModified("subscriptionStatus");
  user.markModified("subscriptionStartAt");
  user.markModified("subscriptionCreatedAt");
  user.markModified("lastBillingDate");
  user.markModified("nextBillingDate");

  console.log("📦 Final subscription before order update:", {
    subscriptionPlan: user.subscriptionPlan,
    subscriptionType: user.subscriptionType,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionExpiresAt: user.subscriptionExpiresAt,
  });

  // ----------------------------------------------------
  // UPDATE USER ORDERS
  // ----------------------------------------------------
  console.log("🧾 BEFORE update - user.orders:", user.orders);

  let matchFound = false;

  user.orders = user.orders.map((o) => {
    const userOrderId = String(o.orderId || o._id || "");
    const incomingId = String(order._id);

    console.log("🔍 Comparing:", { userOrderId, incomingId });

    if (userOrderId === incomingId) {
      console.log("✅ MATCH FOUND → Updating status to 'paid'");
      matchFound = true;

      const updatedOrder = {
        ...(o.toObject?.() ?? o),
        status: "paid",
        updatedAt: new Date(),
      };

      return updatedOrder;
    }

    return o;
  });

  if (!matchFound) {
    console.log("⚠️ No matching order found in user.orders for:", order._id);
  }

  // mark orders modified
  user.markModified("orders");

  console.log("🧾 AFTER update - user.orders:", user.orders);
  console.log("✅ updateUserAfterCryptoPayment COMPLETED");

  return user;
};
