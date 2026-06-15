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

    // Resolve the user: prefer the userId we sent in custom_data, then fall
    // back to matching Paddle's customer email. (Paddle's webhook *simulator*
    // sends custom_data: null, so this also stops simulations failing.)
    const userId = data.custom_data?.userId;
    const customerEmail = (data.customer?.email || "").toLowerCase();

    let user = null;
    if (userId) {
      try { user = await User.findById(userId); } catch { /* invalid id */ }
    }
    if (!user && customerEmail) {
      user = await User.findOne({ email: customerEmail });
    }
    if (!user) {
      // Nothing to update (e.g. Paddle simulation or an unknown customer).
      // Return 200 so Paddle doesn't retry/flag it; just log for visibility.
      console.warn(
        `⚠️ Paddle transaction.completed with no matching user (userId=${userId || "none"}, email=${customerEmail || "none"}) — ignoring.`,
      );
      return res.status(200).json({ received: true, matched: false });
    }

    // 3️⃣ Determine plan
    const item = data.items?.[0] || {};
    // price can be at item.price (transaction.completed) or via line_items.
    const priceId = item.price?.id || data.details?.line_items?.[0]?.price_id;
    // For one-time / lifetime prices Paddle sends billing_cycle: null.
    // Recurring prices have billing_cycle.interval = "month" | "year".
    const billingCycle = item.price?.billing_cycle;
    const endsAt = data.billing_period?.ends_at ? new Date(data.billing_period.ends_at) : null;

    const isMonthlyId = !!priceId && priceId === process.env.PADDLE_MONTHLY_PRICE_ID;
    const isYearlyId = !!priceId && priceId === process.env.PADDLE_YEARLY_PRICE_ID;
    const isLifetimeId = !!priceId && priceId === process.env.PADDLE_LIFETIME_PRICE_ID;

    let plan = "free";
    let type = "none";
    let expiresAt = null;

    if (isLifetimeId || (!isMonthlyId && !isYearlyId && !billingCycle)) {
      // explicit lifetime price, OR any one-time price (no billing cycle) we
      // didn't recognise by ID — treat as lifetime so a config mismatch never
      // silently downgrades a paying customer.
      plan = "lifetime";
      type = "lifetime";
      expiresAt = null;
    } else if (isYearlyId || billingCycle?.interval === "year") {
      plan = "pro";
      type = "recurring";
      expiresAt = endsAt;
    } else if (isMonthlyId || billingCycle?.interval === "month") {
      plan = "pro";
      type = "recurring";
      expiresAt = endsAt;
    }

    console.log(
      `🧾 Paddle txn — priceId=${priceId} cycle=${billingCycle?.interval || "none"} → plan=${plan}/${type}`,
    );

    // Unknown price (couldn't classify) — don't downgrade a user; just ack.
    if (plan === "free") {
      console.warn(`⚠️ Paddle txn with unrecognised price ${priceId} — not changing ${user.email}.`);
      return res.status(200).json({ received: true, matched: true, changed: false });
    }

    // 4️⃣ Create Order — totals live under data.details.totals (top-level
    // data.totals does NOT exist on transaction.completed; reading it crashes).
    const grandTotal = data.details?.totals?.grand_total ?? data.details?.totals?.total ?? "0";
    const order = await Order.create({
      userId: user._id,
      planId: plan,
      amount: Number(grandTotal || 0) / 100,
      currency: data.currency_code || "USD",
      period: plan === "lifetime" ? "lifetime" : "monthly",
      paymentType: type,
      status: "paid",
      meta: data,
    });

    // 5️⃣ Update User
    user.subscriptionPlan = plan;
    user.subscriptionType = type;
    user.subscriptionStatus = "active";
    user.subscriptionSource = "paddle"; // so we can tell what upgraded the user
    user.subscriptionStartAt = new Date(data.created_at);
    user.subscriptionExpiresAt = expiresAt;
    user.subscriptionCreatedAt = new Date();
    user.paddleCustomerId = data.customer_id || data.customer?.id;

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
