const Razorpay = require("razorpay");
const crypto = require("crypto");
const Plan = require("../models/Plan");
const Order = require("../models/Orders");
const Subscription = require("../models/Subscription");
const User = require("../models/User");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// helper: convert INR to paise
const toPaise = (inr) => Math.round(Number(inr) * 100);

// --- Create one-time order ---
exports.createOrder = async (req, res) => {
  try {
    const { planId, period, userName, userEmail } = req.body;

    console.log("📩 Payload received:", {
      planId,
      period,
      userName,
      userEmail,
    });

    if (!planId) return res.status(400).json({ message: "planId required" });
    if (!period) return res.status(400).json({ message: "period required" });

    const plan = await Plan.findOne({ planId });
    if (!plan) return res.status(404).json({ message: "Plan not found" });

    const priceINR = period === "yearly" ? plan.yearly.inr : plan.monthly.inr;
    if (!priceINR)
      return res.status(400).json({ message: "Plan pricing not configured" });

    const amountPaise = toPaise(priceINR);
    console.log(
      `💰 Calculated amount for ${period}: ₹${priceINR} (${amountPaise} paise)`
    );

    // 🔹 Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `receipt_${planId}_${Date.now()}`,
      notes: { planId, period, userEmail },
    });

    // 🔹 Save order in DB
    const dbOrder = new Order({
      userId: req.cookies.userId || null,
      planId,
      amount: amountPaise,
      currency: "INR",
      method: "upi",
      razorpayOrderId: order.id,
      status: "created", // do NOT mark paid yet
      period, // ✅ store period
      meta: { planName: plan.name },
    });
    await dbOrder.save();

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid signature" });
    }

    const dbOrder = await Order.findOne({ razorpayOrderId: razorpay_order_id });
    if (!dbOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    dbOrder.razorpayPaymentId = razorpay_payment_id;
    dbOrder.razorpaySignature = razorpay_signature;
    dbOrder.status = "paid";
    await dbOrder.save();

    const user = await User.findById(dbOrder.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const plan = await Plan.findOne({ planId: dbOrder.planId });

    const startDate = new Date();
    const expiryDate = new Date(startDate);

    // DEBUG: show before setting expiry

    if (dbOrder.period === "yearly") {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    } else {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    }

    // DEBUG: show after expiry calculation

    user.subscriptionStatus = "active";
    user.subscriptionPlan = plan.planId;
    user.subscriptionType = "one-time";
    user.subscriptionStartAt = startDate;
    user.subscriptionExpiresAt = expiryDate;
    if (!user.subscriptionCreatedAt) user.subscriptionCreatedAt = startDate;

    await user.save();

    res.json({
      success: true,
      message: "Payment verified and subscription updated",
      orderId: dbOrder._id,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.createSubscription = async (req, res) => {
  try {
    const { planId, period, userName, userEmail, userContact } = req.body;

    console.log("📩 Payload received:", {
      planId,
      period,
      userName,
      userEmail,
      userContact,
    });

    if (!planId) return res.status(400).json({ message: "planId required" });
    if (!period) return res.status(400).json({ message: "period required" });

    const plan = await Plan.findOne({ planId });
    if (!plan) return res.status(404).json({ message: "Plan not found" });

    const amountINR = period === "yearly" ? plan.yearly.inr : plan.monthly.inr;
    if (!amountINR)
      return res.status(400).json({ message: "Plan pricing not configured" });

    const razorPeriod = period === "yearly" ? "yearly" : "monthly";

    // 🔹 Create or reuse Razorpay plan
    let razorpayPlanId = plan.razorpayPlanId;
    if (!razorpayPlanId) {
      const createdPlan = await razorpay.plans.create({
        period: razorPeriod,
        interval: 1,
        item: {
          name: `${plan.name} ${period}`,
          amount: toPaise(amountINR),
          currency: "INR",
        },
      });
      razorpayPlanId = createdPlan.id;
      plan.razorpayPlanId = razorpayPlanId;
      await plan.save();
    } else {
    }

    // 🔹 Create or reuse customer
    let customerId;
    try {
      const customer = await razorpay.customers.create({
        name: userName || "JournalX user",
        email: userEmail || undefined,
        contact: userContact || undefined,
      });
      customerId = customer.id;
    } catch (err) {
      if (
        err.error?.code === "BAD_REQUEST_ERROR" &&
        err.error.description.includes("Customer already exists")
      ) {
        const existing = await razorpay.customers.all({ email: userEmail });
        customerId = existing.items[0]?.id;
      } else {
        throw err;
      }
    }

    // 🔹 Create subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id: razorpayPlanId,
      customer_id: customerId,
      customer_notify: 1,
      total_count: 12,
      notes: { planId, period },
    });

    // 🔹 Save subscription in DB
    const dbSub = new Subscription({
      userId: req.cookies.userId || null,
      planId,
      period, // ✅ store period explicitly
      razorpayPlanId,
      razorpaySubscriptionId: subscription.id,
      status: "created", // not active until verified
      paymentMethod: "upi",
      meta: { subscription },
    });
    await dbSub.save();

    res.json({
      success: true,
      subscription: { id: subscription.id },
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.verifySubscription = async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature,
    } = req.body;

    const hmac = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
      .digest("hex");

    if (hmac !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid signature" });
    }

    const dbSub = await Subscription.findOne({
      razorpaySubscriptionId: razorpay_subscription_id,
    });
    if (!dbSub) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    dbSub.status = "active";
    await dbSub.save();

    const user = await User.findById(dbSub.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const plan = await Plan.findOne({ planId: dbSub.planId });

    const startDate = new Date();
    const expiryDate = new Date(startDate);

    const period = dbSub.meta?.subscription?.period;

    if (period === "yearly") {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    } else {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    }

    user.subscriptionStatus = "active";
    user.subscriptionPlan = plan.planId;
    user.subscriptionType = "recurring";
    user.subscriptionStartAt = startDate;
    user.subscriptionExpiresAt = expiryDate;
    if (!user.subscriptionCreatedAt) user.subscriptionCreatedAt = startDate;

    await user.save();

    res.json({ success: true, message: "Subscription verified" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// --- Webhook handler (raw body required) ---
exports.webhookHandler = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];
    const body = req.body; // raw Buffer when express.raw used
    const expected = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (expected !== signature) {
      return res.status(400).send("invalid signature");
    }

    const payload = JSON.parse(body.toString());
    // handle event types
    if (
      payload.event === "payment.captured" ||
      payload.event === "payment.authorized"
    ) {
      const rp = payload.payload.payment.entity;
      // find order by razorpayOrderId or payment id and mark paid
      const order = await Order.findOne({ razorpayOrderId: rp.order_id });
      if (order) {
        order.status = "paid";
        order.razorpayPaymentId = rp.id;
        await order.save();
      }
    } else if (
      payload.event === "subscription.charged" ||
      payload.event === "subscription.activated"
    ) {
      const s = payload.payload.subscription.entity;
      const subs = await Subscription.findOne({ razorpaySubscriptionId: s.id });
      if (subs) {
        subs.status = s.status || "active";
        await subs.save();
      }
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).send("server error");
  }
};

// controllers/paymentsController.js - Add these functions

exports.createCryptoOrder = async (req, res) => {
  try {
    const { planName, period, amount, network, currency } = req.body;

    if (!planName || !period || !amount || !network) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const NETWORK_ADDRESSES = {
      erc20: "0x3757a7076cb4eab649de3b44747f260f619ba754",
      trc20: "TP4aBJBJaRL8Qumcb9TTGxecxryQhh8LTT",
      bep20: "0x3757a7076cb4eab649de3b44747f260f619ba754",
      avaxc: "0x3757a7076cb4eab649de3b44747f260f619ba754",
      sol: "Acw24wYJFWhQyk9NR8EHdpCAr53Wsuf1X78A2UPsvWDf",
      ton: "UQAaj0aa-jfxE27qof_4pDByzX2lr9381xeaj6QZAabRUsr1",
    };

    if (!NETWORK_ADDRESSES[network]) {
      return res.status(400).json({ message: "Unsupported network" });
    }

    const plan = await Plan.findOne({ name: new RegExp(planName, "i") });
    if (!plan) return res.status(404).json({ message: "Plan not found" });

    const cryptoPaymentId = `crypto_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const cryptoOrder = new Order({
      userId: req.cookies.userId || null,
      planId: plan.planId,
      amount: parseInt(amount) * 100,
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

    // ✅ Store cryptoPaymentId in HTTP cookie
    res.cookie("cryptoPaymentId", cryptoPaymentId, {
      httpOnly: true,
      maxAge: 10 * 60 * 1000, // 10 minutes
      sameSite: "Strict",
    });

    res.json({
      success: true,
      message: "Crypto order created successfully",
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
