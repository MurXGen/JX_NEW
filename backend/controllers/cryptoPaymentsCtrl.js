// controllers/cryptoPaymentsCtrl.js
const Order = require("../models/Orders");
const Plan = require("../models/Plan");
const User = require("../models/User");
const { sendTelegramNotification } = require("../utils/telegramNotifier");
const {
  updateUserAfterCryptoPayment,
} = require("../utils/updateUserAfterCryptoPayment");

// Helper function to calculate expiry date
const calculateExpiry = (period) => {
  const now = new Date();
  let expiry = new Date(now);

  if (period === "lifetime") {
    expiry.setFullYear(expiry.getFullYear() + 100); // 100 years for lifetime
  } else if (period === "yearly") {
    expiry.setFullYear(expiry.getFullYear() + 1);
  } else {
    expiry.setMonth(expiry.getMonth() + 1); // Default to monthly
  }

  return expiry.toISOString();
};

exports.createCryptoOrder = async (req, res) => {
  try {
    const { planName, period, amount, network, currency, startAt, expiresAt } =
      req.body;

    if (!planName || !period || !amount || !network)
      return res.status(400).json({ message: "Missing required fields" });

    const NETWORK_ADDRESSES = {
      erc20: "0x3757a7076cb4eab649de3b44747f260f619ba754",
      trc20: "TP4aBJBJaRL8Qumcb9TTGxecxryQhh8LTT",
      bep20: "0x3757a7076cb4eab649de3b44747f260f619ba754",
      avaxc: "0x3757a7076cb4eab649de3b44747f260f619ba754",
      sol: "Acw24wYJFWhQyk9NR8EHdpCAr53Wsuf1X78A2UPsvWDf",
      ton: "UQAaj0aa-jfxE27qof_4pDByzX2lr9381xeaj6QZAabRUsr1",
    };

    if (!NETWORK_ADDRESSES[network]) {
      return res.status(400).json({ message: "Invalid network selected" });
    }

    // Normalize plan name for lookup
    const normalizedPlanName = planName.toLowerCase();

    // Try to find plan in database - search with multiple possible names
    let plan = await Plan.findOne({
      $or: [
        { name: new RegExp(normalizedPlanName, "i") },
        { name: new RegExp("lifetime", "i") },
        { planId: period === "lifetime" ? "lifetime" : "pro" },
      ],
    });

    // If plan not found, create a dynamic plan
    if (!plan) {
      // Determine plan type based on name and period
      let planType = "pro";
      let actualPlanName = "Pro";

      if (normalizedPlanName.includes("lifetime") || period === "lifetime") {
        planType = "lifetime";
        actualPlanName = "Lifetime Access";
      }

      // Create a temporary plan object
      plan = {
        planId: `${planType}_${period}_${Date.now()}`,
        name: actualPlanName,
        type: planType,
        price: parseFloat(amount),
      };
    }

    let paymentType = "one-time";
    if (period === "monthly" || period === "yearly") paymentType = "one-time";
    if (period === "lifetime") paymentType = "lifetime";

    const userId = req.user?._id || req.cookies.userId;
    if (!userId)
      return res.status(401).json({ message: "User not authenticated" });

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Calculate start and expiry dates
    const startDate = startAt ? new Date(startAt) : new Date();
    const expiryDate = expiresAt
      ? new Date(expiresAt)
      : new Date(calculateExpiry(period));

    // Determine subscription plan type for user
    let subscriptionPlanType = "pro";
    if (
      normalizedPlanName.includes("lifetime") ||
      period === "lifetime" ||
      plan.type === "lifetime"
    ) {
      subscriptionPlanType = "lifetime";
    }

    const cryptoOrder = new Order({
      userId,
      planId: plan.planId,
      amount: parseFloat(amount),
      currency: currency || "USDT",
      method: "crypto",
      status: "pending",
      period,
      paymentType,
      meta: {
        planName: plan.name,
        network,
        cryptoAddress: NETWORK_ADDRESSES[network],
        startAt: startDate.toISOString(),
        expiresAt: expiryDate.toISOString(),
        subscriptionPlan: subscriptionPlanType,
        originalPlanName: planName,
        isLifetime:
          period === "lifetime" || subscriptionPlanType === "lifetime",
      },
    });

    await cryptoOrder.save();

    // 🔹 Push order reference to user's orders array
    user.orders.push({
      orderId: cryptoOrder._id,
      status: cryptoOrder.status,
      createdAt: new Date(),
      paymentMethod: "crypto",
    });

    await user.save();

    await sendTelegramNotification({
      name: user.name || "N/A",
      email: user.email || "N/A",
      type: "payment",
      status: "Created",
      details: `Plan: ${plan.name}\nPeriod: ${period}\nAmount: ${amount} ${currency || "USDT"}\nNetwork: ${network.toUpperCase()}\nOrder ID: ${cryptoOrder._id}`,
      orderId: cryptoOrder._id,
    });

    res.json({
      success: true,
      message: "Crypto order created successfully",
      orderId: cryptoOrder._id,
      cryptoAddress: NETWORK_ADDRESSES[network],
      amount: amount,
      currency: currency || "USDT",
      network: network,
      isLifetime: period === "lifetime",
    });
  } catch (err) {
    console.error("Create crypto order error:", err.message);
    res.status(500).json({
      message: "Server error",
      error: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
};
exports.verifyCryptoPayment = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res
        .status(400)
        .json({ success: false, message: "orderId required" });
    }

    const dbOrder = await Order.findById(orderId);
    if (!dbOrder) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // DEV MODE auto-confirm (safe)
    if (
      process.env.NODE_ENV === "development" &&
      dbOrder.status === "pending"
    ) {
      dbOrder.status = "paid";
      dbOrder.meta.paidAt = new Date().toISOString();
      await dbOrder.save();
    }

    if (dbOrder.status !== "paid") {
      return res.json({
        success: false,
        status: dbOrder.status,
        message: "Payment not confirmed yet",
      });
    }

    // 🔥 Fetch fresh user
    let user = await User.findById(dbOrder.userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // 🔥 Apply subscription update logic
    await updateUserAfterCryptoPayment(user, dbOrder);

    // ❗ Save user
    await user.save();

    // ❗ Fetch fresh updated user again to avoid stale cache
    user = await User.findById(user._id);

    console.log("🔥 Final subscription:", {
      plan: user.subscriptionPlan,
      status: user.subscriptionStatus,
      type: user.subscriptionType,
      expiresAt: user.subscriptionExpiresAt,
    });

    return res.json({
      success: true,
      message: "Payment verified & subscription activated",
      subscriptionPlan: user.subscriptionPlan,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionType: user.subscriptionType,
      expiresAt: user.subscriptionExpiresAt,
    });
  } catch (err) {
    console.error("Verify payment error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};
