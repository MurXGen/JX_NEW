const Order = require("../models/Orders");
const Plan = require("../models/Plan");
const User = require("../models/User");
const { sendTelegramNotification } = require("../utils/telegramNotifier");

exports.createCryptoOrder = async (req, res) => {
  try {
    const { planName, period, amount, network, currency } = req.body;

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

    if (!NETWORK_ADDRESSES[network])
      return res.status(400).json({ message: "Unsupported network" });

    const plan = await Plan.findOne({ name: new RegExp(planName, "i") });
    if (!plan) return res.status(404).json({ message: "Plan not found" });

    const cryptoPaymentId = `crypto_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const cryptoOrder = new Order({
      userId: req.cookies.userId || null,
      planId: plan.planId,
      amount: amount,
      currency: currency || "USDT",
      method: "crypto",
      cryptoPaymentId,
      status: "pending",
      period,
      meta: {
        planName: plan.name,
        network,
        cryptoAddress: NETWORK_ADDRESSES[network],
      },
    });

    await cryptoOrder.save();

    // Store cryptoPaymentId in HTTP cookie
    res.cookie("cryptoPaymentId", cryptoPaymentId, {
      httpOnly: true,
      maxAge: 10 * 60 * 1000, // 10 minutes
      sameSite: "Strict",
    });

    // ✅ Send Telegram notification to payment group
    await sendTelegramNotification({
      chatId: process.env.TELEGRAM_PAYMENTS_CHAT_ID, // separate group chat ID
      name: req.user?.name || "Guest",
      email: req.user?.email || "N/A",
      type: "crypto_payment",
      status: "pending",
      message: `
📌 *New Crypto Payment*
━━━━━━━━━━━━━━━
👤 User: ${req.user?.name || "Guest"}
📧 Email: ${req.user?.email || "N/A"}
💳 Plan: ${plan.name}
💰 Amount: ${amount} ${currency || "USDT"}
🪙 Network: ${network}
🔗 Address: ${NETWORK_ADDRESSES[network]}
🕒 Time: ${new Date().toLocaleString("en-IN")}
      `,
    });

    res.json({
      success: true,
      message: "Crypto order created successfully",
      orderId: cryptoOrder._id,
    });
  } catch (err) {
    console.error(err.message);
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

    // 🔹 Find order
    const dbOrder = await Order.findById(orderId);
    if (!dbOrder) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // 🔹 Still pending or failed → polling continues
    if (dbOrder.status !== "paid") {
      return res.json({
        success: false,
        status: dbOrder.status,
        message: "Payment not confirmed yet",
      });
    }

    // 🔹 If already verified earlier, prevent duplicate subscription updates
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

    // 🔹 Update subscription
    const startDate = new Date();
    const expiryDate = new Date(startDate);
    if (dbOrder.period === "yearly") {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    } else {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    }

    user.subscriptionStatus = "active";
    user.subscriptionPlan = dbOrder.planId;
    user.subscriptionType = "one-time";
    user.subscriptionStartAt = startDate;
    user.subscriptionExpiresAt = expiryDate;
    if (!user.subscriptionCreatedAt) user.subscriptionCreatedAt = startDate;

    await user.save();

    // 🔹 Update order to mark it verified
    dbOrder.status = "paid";
    dbOrder.updatedAt = new Date();
    await dbOrder.save();

    res.json({
      success: true,
      message: "Payment verified and subscription activated",
      orderId: dbOrder._id,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
