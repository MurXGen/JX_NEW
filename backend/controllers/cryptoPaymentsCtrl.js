// controllers/cryptoPaymentsCtrl.js
const Order = require("../models/Orders");
const Plan = require("../models/Plan");
const User = require("../models/User");
const { sendTelegramNotification } = require("../utils/telegramNotifier");

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

    const plan = await Plan.findOne({ name: new RegExp(planName, "i") });
    if (!plan) return res.status(404).json({ message: "Plan not found" });

    // Determine payment type based on period
    let paymentType = "one-time";
    if (period === "monthly") paymentType = "recurring";
    if (period === "lifetime") paymentType = "lifetime";

    const cryptoOrder = new Order({
      userId: req.user?._id || req.cookies.userId || null,
      planId: plan.planId,
      amount,
      currency: currency || "USDT",
      method: "crypto",
      status: "pending",
      period,
      paymentType,
      meta: {
        planName: plan.name,
        network,
        cryptoAddress: NETWORK_ADDRESSES[network],
        startAt: startAt || new Date().toISOString(),
        expiresAt: expiresAt || calculateExpiry(period),
      },
    });

    await cryptoOrder.save();

    await sendTelegramNotification({
      name: req.user?.name || "N/A",
      email: req.user?.email || "N/A",
      type: "payment",
      status: "Created",
      details: `Plan: ${plan.name}\nPeriod: ${period}\nAmount: ${amount} ${currency || "USDT"}\nNetwork: ${network.toUpperCase()}`,
      orderId: cryptoOrder._id,
    });

    res.json({
      success: true,
      message: "Crypto order created successfully",
      orderId: cryptoOrder._id,
    });
  } catch (err) {
    console.error("Create order error:", err.message);
    res.status(500).json({ message: "Server error" });
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

    if (dbOrder.status !== "paid") {
      return res.json({
        success: false,
        status: dbOrder.status,
        message: "Payment not confirmed yet",
      });
    }

    const user = await User.findById(dbOrder.userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // If subscription already active for this order → short-circuit success
    if (
      user.subscriptionPlan === dbOrder.planId &&
      user.subscriptionStatus === "active"
    ) {
      return res.json({
        success: true,
        message: "Payment already verified and subscription active",
        orderId: dbOrder._id,
      });
    }

    // Calculate expiry based on period
    const startDate = new Date();
    let expiryDate = new Date(startDate);

    if (dbOrder.period === "lifetime") {
      // Set expiry to 100 years for lifetime plans
      expiryDate.setFullYear(expiryDate.getFullYear() + 100);
    } else if (dbOrder.period === "yearly") {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    } else {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    }

    // Update user subscription
    user.subscriptionStatus = "active";
    user.subscriptionPlan = dbOrder.planId;
    user.subscriptionType = dbOrder.paymentType; // one-time, recurring, or lifetime
    user.subscriptionStartAt = startDate;
    user.subscriptionExpiresAt = expiryDate;
    if (!user.subscriptionCreatedAt) user.subscriptionCreatedAt = startDate;

    await user.save();

    // Update order status
    dbOrder.status = "paid";
    dbOrder.updatedAt = new Date();
    await dbOrder.save();

    res.json({
      success: true,
      message: "Payment verified and subscription activated",
      orderId: dbOrder._id,
      period: dbOrder.period,
      planId: dbOrder.planId,
    });
  } catch (err) {
    console.error("Verify payment error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Helper function to calculate expiry
function calculateExpiry(period) {
  const expiry = new Date();
  if (period === "lifetime") {
    expiry.setFullYear(expiry.getFullYear() + 100);
  } else if (period === "yearly") {
    expiry.setFullYear(expiry.getFullYear() + 1);
  } else {
    expiry.setMonth(expiry.getMonth() + 1);
  }
  return expiry.toISOString();
}
