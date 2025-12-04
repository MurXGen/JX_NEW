const User = require("../models/User");
const Order = require("../models/PaddleOrder");

// Handle Paddle Webhooks
exports.paddleWebhookHandler = async (req, res) => {
  try {
    const body = JSON.parse(req.body); // since Paddle sends raw body

    console.log("📩 Paddle Webhook Received:", body);

    const event = body.event_type;
    const data = body.data;

    // 1️⃣ Only handle successful transactions
    if (event !== "transaction.completed") {
      console.log("Ignored event:", event);
      return res.status(200).send("Ignored");
    }

    const userEmail = data?.customer?.email;
    if (!userEmail) return res.status(400).send("No user email");

    const user = await User.findOne({ email: userEmail });
    if (!user) return res.status(404).send("User not found");

    // 2️⃣ Determine plan type from priceId
    const priceId = data.items?.[0]?.price?.id;

    let planId = "free";
    let period = "monthly";
    let paymentType = "one-time";

    if (priceId === process.env.PADDLE_PRICE_MONTHLY) {
      planId = "pro";
      period = "monthly";
    } else if (priceId === process.env.PADDLE_PRICE_YEARLY) {
      planId = "pro";
      period = "yearly";
    } else if (priceId === process.env.PADDLE_PRICE_LIFETIME) {
      planId = "MASTER001"; // you said MASTER = lifetime
      period = "lifetime";
      paymentType = "lifetime";
    }

    // 3️⃣ Create order record
    const order = await Order.create({
      userId: user._id,
      paddleTransactionId: data.id,
      paddlePriceId: priceId,
      planId,
      paymentType,
      period,
      amount: data.details.totals.total,
      currency: data.details.totals.currency,
      status: "paid",
    });

    // 4️⃣ Activate subscription using your schema method
    user.activateSubscription(order);
    await user.save();

    console.log("🎉 Subscription Activated for:", user.email);

    res.status(200).send("OK");
  } catch (err) {
    console.error("❌ Paddle Webhook Error:", err);
    res.status(500).send("Webhook Error");
  }
};
