const crypto = require("crypto");
const User = require("../models/User");
const Order = require("../models/Orders");
const {
  updateUserAfterCryptoPayment,
} = require("../utils/updateUserAfterCryptoPayment");

const PADDLE_WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET;

exports.paddleWebhook = async (req, res) => {
  try {
    const signature = req.headers["paddle-signature"];
    const rawBody = JSON.stringify(req.body);

    // 1️⃣ VERIFY SIGNATURE
    const expectedSignature = crypto
      .createHmac("sha256", PADDLE_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.log("❌ Invalid webhook signature");
      return res.status(401).json({ message: "Invalid signature" });
    }

    const event = req.body;

    console.log("📩 Received Paddle Webhook:", event);

    // --------------------------------------------------------------------
    // 2️⃣ GET USER FROM EVENT
    // --------------------------------------------------------------------
    const email = event?.data?.customer?.email;

    if (!email) {
      console.log("❌ No customer email found in webhook");
      return res.status(400).json({ message: "Missing user email" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      console.log("❌ User not found:", email);
      return res.status(404).json({ message: "User not found" });
    }

    // --------------------------------------------------------------------
    // 3️⃣ CREATE OR UPDATE ORDER
    // --------------------------------------------------------------------
    const eventData = event.data;

    const paddleOrderId = eventData?.id;
    const priceId = eventData?.items?.[0]?.price?.id;
    const period =
      eventData?.items?.[0]?.price?.billing_interval ||
      eventData?.billing_period ||
      "one-time";

    // Save order
    let order = await Order.findOne({ paddleOrderId });

    if (!order) {
      order = await Order.create({
        userId: user._id,
        paddleOrderId,
        priceId,
        period,
        amount: eventData?.grand_total,
        status: "paid",
        meta: eventData,
      });
    }

    // --------------------------------------------------------------------
    // 4️⃣ UPDATE USER SUBSCRIPTION
    // --------------------------------------------------------------------
    await updateUserAfterCryptoPayment(user, order);
    await user.save();

    console.log("🎉 User subscription updated successfully!");

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Paddle Webhook Error:", err);
    return res.status(500).json({ message: "Webhook processing failed" });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const { priceId, period } = req.body;
    const userId = req.user._id;

    const order = await Order.create({
      userId,
      priceId,
      period,
      status: "pending",
      createdAt: new Date(),
    });

    return res.json({ success: true, orderId: order._id });
  } catch (err) {
    console.error("Create Order Error:", err);
    return res.status(500).json({ message: "Failed to create order" });
  }
};
