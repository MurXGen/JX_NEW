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
    console.log("🟢 CREATE ORDER HIT");
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

    console.log("🧾 Razorpay order created:", order.id);

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

    console.log("✅ Order saved in DB:", dbOrder._id);

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
    console.error("🔥 createOrder Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    console.log("🟢 VERIFY PAYMENT HIT");
    console.log("Body:", req.body);

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      console.log("❌ Invalid signature");
      return res.status(400).json({ message: "Invalid signature" });
    }

    const dbOrder = await Order.findOne({ razorpayOrderId: razorpay_order_id });
    if (!dbOrder) {
      console.log("❌ Order not found:", razorpay_order_id);
      return res.status(404).json({ message: "Order not found" });
    }

    console.log("✅ Order found:", dbOrder);
    console.log("🧾 Plan period:", dbOrder.period);

    dbOrder.razorpayPaymentId = razorpay_payment_id;
    dbOrder.razorpaySignature = razorpay_signature;
    dbOrder.status = "paid";
    await dbOrder.save();

    const user = await User.findById(dbOrder.userId);
    if (!user) {
      console.log("❌ User not found:", dbOrder.userId);
      return res.status(404).json({ message: "User not found" });
    }

    const plan = await Plan.findOne({ planId: dbOrder.planId });
    console.log("📦 Plan found:", plan?.planId);

    const startDate = new Date();
    const expiryDate = new Date(startDate);

    // DEBUG: show before setting expiry
    console.log("📅 Before expiry set:", { startDate, expiryDate });

    if (dbOrder.period === "yearly") {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      console.log("🗓️ Setting expiry +1 year");
    } else {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
      console.log("🗓️ Setting expiry +1 month");
    }

    // DEBUG: show after expiry calculation
    console.log("📅 Final expiry:", expiryDate);

    user.subscriptionStatus = "active";
    user.subscriptionPlan = plan.planId;
    user.subscriptionType = "one-time";
    user.subscriptionStartAt = startDate;
    user.subscriptionExpiresAt = expiryDate;
    if (!user.subscriptionCreatedAt) user.subscriptionCreatedAt = startDate;

    await user.save();
    console.log("✅ User updated:", user._id);

    res.json({
      success: true,
      message: "Payment verified and subscription updated",
      orderId: dbOrder._id,
    });
  } catch (err) {
    console.error("🔥 verifyPayment Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.createSubscription = async (req, res) => {
  try {
    console.log("🟢 CREATE SUBSCRIPTION HIT");
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
    console.log(`💰 Calculated amount for ${period}: ₹${amountINR}`);

    // 🔹 Create or reuse Razorpay plan
    let razorpayPlanId = plan.razorpayPlanId;
    if (!razorpayPlanId) {
      console.log("📦 Creating new Razorpay plan...");
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
      console.log("✅ New Razorpay plan created:", razorpayPlanId);
    } else {
      console.log("🔁 Reusing existing Razorpay plan:", razorpayPlanId);
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
      console.log("👤 New customer created:", customerId);
    } catch (err) {
      if (
        err.error?.code === "BAD_REQUEST_ERROR" &&
        err.error.description.includes("Customer already exists")
      ) {
        console.log("⚠️ Customer already exists, fetching existing...");
        const existing = await razorpay.customers.all({ email: userEmail });
        customerId = existing.items[0]?.id;
        console.log("👤 Existing customer ID:", customerId);
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

    console.log("🧾 Razorpay subscription created:", subscription.id);

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

    console.log("✅ Subscription saved in DB:", dbSub._id);

    res.json({
      success: true,
      subscription: { id: subscription.id },
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("🔥 createSubscription Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.verifySubscription = async (req, res) => {
  try {
    console.log("🟢 VERIFY SUBSCRIPTION HIT");
    console.log("Body:", req.body);

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
      console.log("❌ Invalid subscription signature");
      return res.status(400).json({ message: "Invalid signature" });
    }

    const dbSub = await Subscription.findOne({
      razorpaySubscriptionId: razorpay_subscription_id,
    });
    if (!dbSub) {
      console.log("❌ Subscription not found:", razorpay_subscription_id);
      return res.status(404).json({ message: "Subscription not found" });
    }

    console.log("✅ Subscription found:", dbSub);
    console.log("🧾 Plan period:", dbSub.meta?.subscription?.period);

    dbSub.status = "active";
    await dbSub.save();

    const user = await User.findById(dbSub.userId);
    if (!user) {
      console.log("❌ User not found:", dbSub.userId);
      return res.status(404).json({ message: "User not found" });
    }

    const plan = await Plan.findOne({ planId: dbSub.planId });
    console.log("📦 Plan found:", plan?.planId);

    const startDate = new Date();
    const expiryDate = new Date(startDate);

    const period = dbSub.meta?.subscription?.period;
    console.log("📆 Period received:", period);

    if (period === "yearly") {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      console.log("🗓️ Setting expiry +1 year");
    } else {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
      console.log("🗓️ Setting expiry +1 month");
    }

    console.log("📅 Final expiry:", expiryDate);

    user.subscriptionStatus = "active";
    user.subscriptionPlan = plan.planId;
    user.subscriptionType = "recurring";
    user.subscriptionStartAt = startDate;
    user.subscriptionExpiresAt = expiryDate;
    if (!user.subscriptionCreatedAt) user.subscriptionCreatedAt = startDate;

    await user.save();
    console.log("✅ User updated:", user._id);

    res.json({ success: true, message: "Subscription verified" });
  } catch (err) {
    console.error("🔥 verifySubscription Error:", err);
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
      console.warn("Webhook signature mismatch");
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
    console.error("webhookHandler error", err);
    res.status(500).send("server error");
  }
};

// controllers/paymentsController.js - Add these functions

exports.createCryptoOrder = async (req, res) => {
  try {
    console.log("🟢 CREATE CRYPTO ORDER HIT");
    const { planName, period, amount, network, currency } = req.body;

    if (!planName || !period || !amount || !network) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const NETWORK_ADDRESSES = {
      erc20: "0x742d35Cc6634C0532925a3b8Dc9B6e7f6C5A8E1F",
      trc20: "TXYZ1234567890abcdefghijklmnopqrstuvw",
      bep20: "0x8Ba1f109551bD432803012645Ac136ddd64DBA72",
      avaxc: "0x9Ab3FD5c9d5e6B6d6C9B9E8D8F7A6D5C4B3A2E1F",
      sol: "7Z5XWY6ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789",
      ton: "EQABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890abcdefghijklmnopqrstuvwxyz",
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

    console.log("✅ Crypto order saved:", cryptoOrder._id);

    res.json({
      success: true,
      message: "Crypto order created successfully",
    });
  } catch (err) {
    console.error("🔥 createCryptoOrder Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
