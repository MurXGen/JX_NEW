const crypto = require("crypto");
const User = require("../models/User");
const Order = require("../models/Orders");

// 🔐 Verify Paddle (Billing) webhook signature.
//   Header format:  Paddle-Signature: ts=<unix>;h1=<hmac>[;h1=<hmac>...]
//   Signed payload: `${ts}:${rawRequestBody}`  (HMAC-SHA256 with the secret key)
//   We compare our HMAC against the h1 value(s) using a length-guarded
//   timing-safe comparison. Requires req.body to still be the RAW Buffer.
function verifyPaddleSignature(req) {
  try {
    const header = req.headers["paddle-signature"];
    const secret = process.env.PADDLE_WEBHOOK_SECRET;
    if (!header || !secret) return false;

    // parse "ts=...;h1=...;h1=..."
    const parsed = { h1: [] };
    for (const part of String(header).split(";")) {
      const idx = part.indexOf("=");
      if (idx === -1) continue;
      const key = part.slice(0, idx).trim();
      const val = part.slice(idx + 1).trim();
      if (key === "ts") parsed.ts = val;
      else if (key === "h1") parsed.h1.push(val);
    }
    if (!parsed.ts || parsed.h1.length === 0) return false;

    // raw body MUST be the unparsed bytes for this to match
    const raw = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : String(req.body);
    const signedPayload = `${parsed.ts}:${raw}`;
    const computed = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
    const computedBuf = Buffer.from(computed, "hex");

    return parsed.h1.some((h) => {
      try {
        const hBuf = Buffer.from(h, "hex");
        return hBuf.length === computedBuf.length && crypto.timingSafeEqual(hBuf, computedBuf);
      } catch {
        return false;
      }
    });
  } catch (err) {
    console.error("❌ Paddle signature verification error:", err.message);
    return false;
  }
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
