const crypto = require("crypto");
const User = require("../models/User");
const Order = require("../models/Orders");

// 🔐 Verify Paddle signature
function verifyPaddleSignature(req) {
  const signature = req.headers["paddle-signature"];
  if (!signature) return false;

  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  const payload = req.body;

  const computed = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computed));
}

exports.handlePaddleWebhook = async (req, res) => {
  try {
    // 1️⃣ Verify signature
    if (!verifyPaddleSignature(req)) {
      console.error("❌ Invalid Paddle signature");
      return res.status(401).send("Invalid signature");
    }

    const event = JSON.parse(req.body.toString());
    console.log("📩 Paddle webhook:", event.event_type);

    // 2️⃣ Only handle successful payments
    if (event.event_type !== "transaction.completed") {
      return res.status(200).send("Ignored");
    }

    const data = event.data;

    /**
     * data.custom_data.userId  ← YOU sent this from frontend
     * data.customer.email
     * data.items[0].price.id
     */

    const userId = data.custom_data?.userId;
    if (!userId) {
      console.error("❌ userId missing in custom_data");
      return res.status(400).send("Missing userId");
    }

    const user = await User.findById(userId);
    if (!user) {
      console.error("❌ User not found:", userId);
      return res.status(404).send("User not found");
    }

    // 3️⃣ Determine plan
    const priceId = data.items[0].price.id;

    let plan = "free";
    let type = "none";
    let expiresAt = null;

    if (priceId === process.env.PADDLE_MONTHLY_PRICE_ID) {
      plan = "pro";
      type = "recurring";
      expiresAt = new Date(data.billing_period?.ends_at);
    }

    if (priceId === process.env.PADDLE_YEARLY_PRICE_ID) {
      plan = "pro";
      type = "recurring";
      expiresAt = new Date(data.billing_period?.ends_at);
    }

    if (priceId === process.env.PADDLE_LIFETIME_PRICE_ID) {
      plan = "lifetime";
      type = "lifetime";
      expiresAt = null; // lifetime never expires
    }

    // 4️⃣ Create Order
    const order = await Order.create({
      userId: user._id,
      planId: plan,
      amount: data.totals.total / 100,
      currency: data.currency_code,
      period: plan === "lifetime" ? "lifetime" : "monthly",
      paymentType: type,
      status: "paid",
      meta: data,
    });

    // 5️⃣ Update User
    user.subscriptionPlan = plan;
    user.subscriptionType = type;
    user.subscriptionStatus = "active";
    user.subscriptionStartAt = new Date(data.created_at);
    user.subscriptionExpiresAt = expiresAt;
    user.subscriptionCreatedAt = new Date();
    user.paddleCustomerId = data.customer.id;

    user.orders.push({
      orderId: order._id,
      status: "paid",
    });

    await user.save();

    console.log("✅ User subscription updated:", user.email);

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("❌ Paddle webhook error:", err);
    res.status(500).send("Webhook error");
  }
};
