const Order = require("../models/Orders");
const Plan = require("../models/Plan");
const User = require("../models/User");

exports.createCryptoOrder = async (req, res) => {
  try {
    const { planName, period, amount, network, currency } = req.body;

    if (!planName || !period || !amount || !network)
      return res.status(400).json({ message: "Missing required fields" });

    const NETWORK_ADDRESSES = {
      erc20: "0x742d35Cc6634C0532925a3b8Dc9B6e7f6C5A8E1F",
      trc20: "TXYZ1234567890abcdefghijklmnopqrstuvw",
      bep20: "0x8Ba1f109551bD432803012645Ac136ddd64DBA72",
      avaxc: "0x9Ab3FD5c9d5e6B6d6C9B9E8D8F7A6D5C4B3A2E1F",
      sol: "7Z5XWY6ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789",
      ton: "EQABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890abcdefghijklmnopqrstuvwxyz",
    };

    if (!NETWORK_ADDRESSES[network])
      return res.status(400).json({ message: "Unsupported network" });

    const plan = await Plan.findOne({ name: new RegExp(planName, "i") });
    if (!plan) return res.status(404).json({ message: "Plan not found" });

    const cryptoPaymentId = `crypto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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

    res.json({
      success: true,
      message: "Crypto order created successfully",
      orderId: cryptoOrder._id, // ✅ return orderId
    });
  } catch (err) {
    console.error("🔥 createCryptoOrder Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.verifyCryptoPayment = async (req, res) => {
  try {
    console.log("🟢 VERIFY CRYPTO PAYMENT HIT");
    const { orderId } = req.body;

    if (!orderId) {
      return res
        .status(400)
        .json({ success: false, message: "orderId required" });
    }

    // 🔹 Find order
    const dbOrder = await Order.findById(orderId);
    if (!dbOrder) {
      console.log("❌ Order not found:", orderId);
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    console.log(`🔍 Current order status: ${dbOrder.status}`);

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
      console.log("❌ User not found:", dbOrder.userId);
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
    console.log("✅ User subscription updated:", user._id);

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
    console.error("🔥 verifyCryptoPayment Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
