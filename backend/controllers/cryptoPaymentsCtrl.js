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

    let paymentType = "one-time";
    if (period === "monthly") paymentType = "one-time";
    if (period === "lifetime") paymentType = "lifetime";

    const userId = req.user?._id || req.cookies.userId;
    if (!userId)
      return res.status(401).json({ message: "User not authenticated" });

    const cryptoOrder = new Order({
      userId,
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

    // 🔹 Push order reference to user's orders array
    await User.findByIdAndUpdate(userId, {
      $push: {
        orders: {
          orderId: cryptoOrder._id,
          status: cryptoOrder.status,
          createdAt: new Date(),
        },
      },
    });

    await sendTelegramNotification({
      name: req.user?.name || "N/A",
      email: req.user?.email || "N/A",
      type: "payment",
      status: "Created",
      details: `Plan: ${plan.name}\nPeriod: ${period}\nAmount: ${amount} ${
        currency || "USDT"
      }\nNetwork: ${network.toUpperCase()}`,
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

    // ✅ Activate subscription using schema method
    user.activateSubscription({
      _id: dbOrder._id,
      planId: dbOrder.planId,
      paymentType: dbOrder.paymentType,
      period: dbOrder.period,
      status: dbOrder.status,
    });

    await user.save();

    // ✅ Update order status
    dbOrder.status = "paid";
    dbOrder.updatedAt = new Date();
    await dbOrder.save();

    return res.json({
      success: true,
      message: "Payment verified and subscription activated",
      orderId: dbOrder._id,
      planId: dbOrder.planId,
      period: dbOrder.period,
    });
  } catch (err) {
    console.error("Verify payment error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
