const Razorpay = require("razorpay");
const crypto = require("crypto");
const Plan = require("../models/Plan");
const Order = require("../models/Order");
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
    const { planId, period /* monthly/yearly */, userName, userEmail } =
      req.body;
    // validate
    if (!planId) return res.status(400).json({ message: "planId required" });

    // fetch plan from DB and ensure amount matches server-side
    const plan = await Plan.findOne({ planId });
    if (!plan) return res.status(404).json({ message: "Plan not found" });

    // choose amount based on period
    const priceINR = period === "yearly" ? plan.yearly.inr : plan.monthly.inr;
    if (!priceINR)
      return res.status(400).json({ message: "Plan pricing not configured" });

    const amountPaise = toPaise(priceINR);

    // Create razorpay order
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `receipt_${planId}_${Date.now()}`,
      notes: {
        planId,
      },
    });

    // Save local order
    const dbOrder = new Order({
      userId: req.cookies.userId || null,
      planId,
      amount: amountPaise,
      currency: "INR",
      method: "upi",
      razorpayOrderId: order.id,
      status: "created",
      meta: { planName: plan.name },
    });
    await dbOrder.save();

    res.json({
      success: true,
      order: { id: order.id, amount: order.amount, currency: order.currency },
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("createOrder error", err);
    res.status(500).json({ message: "Server error" });
  }
};

// --- Verify one-time payment from client (handler) ---
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;
    if (!razorpay_signature)
      return res.status(400).json({ message: "Missing signature" });

    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid signature" });
    }

    // find order
    const dbOrder = await Order.findOne({ razorpayOrderId: razorpay_order_id });
    if (!dbOrder) return res.status(404).json({ message: "Order not found" });

    dbOrder.razorpayPaymentId = razorpay_payment_id;
    dbOrder.razorpaySignature = razorpay_signature;
    dbOrder.status = "paid";
    await dbOrder.save();

    // Optionally: capture payment via API if not auto-captured (Razorpay auto-captures by default in checkout)
    // await razorpay.payments.capture(razorpay_payment_id, dbOrder.amount, 'INR');

    return res.json({
      success: true,
      message: "Payment verified",
      orderId: dbOrder._id,
    });
  } catch (err) {
    console.error("verifyPayment", err);
    res.status(500).json({ message: "Server error" });
  }
};

// --- Create subscription (recurring) ---
exports.createSubscription = async (req, res) => {
  try {
    const { planId, period, userName, userEmail, userContact } = req.body;
    console.log("✅ Request body:", req.body);

    if (!planId) return res.status(400).json({ message: "planId required" });

    const plan = await Plan.findOne({ planId });
    console.log("✅ Fetched plan from DB:", plan);

    if (!plan) return res.status(404).json({ message: "Plan not found" });

    // Decide Razorpay period string
    const razorPeriod = period === "yearly" ? "yearly" : "monthly";

    console.log("✅ Razorpay period:", razorPeriod);

    const amountINR = period === "yearly" ? plan.yearly.inr : plan.monthly.inr;
    console.log("✅ Amount INR for plan:", amountINR);

    if (!amountINR)
      return res.status(400).json({ message: "Plan pricing not configured" });

    // If plan has razorpayPlanId, reuse it
    let razorpayPlanId = plan.razorpayPlanId;
    if (!razorpayPlanId) {
      console.log("ℹ️ Creating new Razorpay plan...");

      const razorPeriod = period === "yearly" ? "yearly" : "monthly";
      const planPayload = {
        period: razorPeriod,
        interval: 1,
        item: {
          name: `${plan.name} ${period}`,
          amount: toPaise(amountINR),
          currency: "INR",
        },
      };

      console.log(
        "➡️ Razorpay plan payload:",
        JSON.stringify(planPayload, null, 2)
      );

      try {
        const createdPlan = await razorpay.plans.create(planPayload);
        console.log("✅ Razorpay plan created successfully:", createdPlan);

        razorpayPlanId = createdPlan.id;
        plan.razorpayPlanId = razorpayPlanId;
        await plan.save();
      } catch (err) {
        console.error("❌ Razorpay plan creation failed:", err);
        throw err;
      }
    } else {
      console.log("ℹ️ Using existing Razorpay plan ID:", razorpayPlanId);
    }

    // Create Razorpay customer
    let customerId;

    try {
      // Try to create customer
      const customer = await razorpay.customers.create({
        name: userName || "JournalX user",
        email: userEmail || undefined,
        contact: userContact || undefined,
      });
      customerId = customer.id;
      console.log("✅ Razorpay customer created:", customer);
    } catch (err) {
      // If customer already exists, search by email
      if (
        err.error?.code === "BAD_REQUEST_ERROR" &&
        err.error.description.includes("Customer already exists")
      ) {
        const existingCustomers = await razorpay.customers.all({
          email: userEmail,
        });
        if (existingCustomers.items.length > 0) {
          customerId = existingCustomers.items[0].id;
          console.log("ℹ️ Reusing existing Razorpay customer:", customerId);
        } else {
          throw err; // If we cannot find it, throw
        }
      } else {
        throw err; // other errors
      }
    }

    // Proceed to create subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id: razorpayPlanId,
      customer_id: customerId,
      customer_notify: 1,
      total_count: 12, // number of cycles for recurring
    });

    console.log("✅ Subscription created:", subscription);

    // Save in DB
    const dbSub = new Subscription({
      userId: req.cookies.userId || null,
      planId,
      razorpayPlanId,
      razorpaySubscriptionId: subscription.id,
      status: subscription.status || "created",
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
    console.error("❌ createSubscription error:", err);

    // If Razorpay returns an error response
    if (err?.error) {
      console.error("❌ Razorpay error details:", err.error);
      return res
        .status(400)
        .json({ message: err.error.description, details: err.error });
    }

    res.status(500).json({ message: "Server error" });
  }
};

// --- Verify subscription payment after client checkout ---
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

    // mark subscription record active
    const dbSub = await Subscription.findOne({
      razorpaySubscriptionId: razorpay_subscription_id,
    });
    if (!dbSub)
      return res.status(404).json({ message: "Subscription not found" });

    dbSub.status = "active";
    await dbSub.save();

    return res.json({ success: true });
  } catch (err) {
    console.error("verifySubscription", err);
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
