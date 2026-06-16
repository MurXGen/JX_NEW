const crypto = require("crypto");
const User = require("../models/User");
const Order = require("../models/Orders");
const { paddle } = require("../utils/paddle");

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

// Map a Paddle transaction object → our plan/type/expiry.
// One-time / lifetime prices have billing_cycle: null; recurring have month/year.
function classifyTransaction(data) {
  const item = data.items?.[0] || {};
  const priceId = item.price?.id || data.details?.line_items?.[0]?.price_id;
  const billingCycle = item.price?.billing_cycle;
  const endsAt = data.billing_period?.ends_at ? new Date(data.billing_period.ends_at) : null;

  const isMonthlyId = !!priceId && priceId === process.env.PADDLE_MONTHLY_PRICE_ID;
  const isYearlyId = !!priceId && priceId === process.env.PADDLE_YEARLY_PRICE_ID;
  const isLifetimeId = !!priceId && priceId === process.env.PADDLE_LIFETIME_PRICE_ID;

  let plan = "free", type = "none", expiresAt = null;
  if (isLifetimeId || (!isMonthlyId && !isYearlyId && !billingCycle)) {
    plan = "lifetime"; type = "lifetime"; expiresAt = null;
  } else if (isYearlyId || billingCycle?.interval === "year") {
    plan = "pro"; type = "recurring"; expiresAt = endsAt;
  } else if (isMonthlyId || billingCycle?.interval === "month") {
    plan = "pro"; type = "recurring"; expiresAt = endsAt;
  }
  return { plan, type, expiresAt, priceId, billingCycle };
}

// Apply a classified plan to a user doc (does NOT save). Enforces lifetime
// stickiness (returns false if it would downgrade a lifetime user).
function applyPlanToUser(user, cls, data) {
  if (user.subscriptionPlan === "lifetime" && cls.plan !== "lifetime") return false;
  user.subscriptionPlan = cls.plan;
  user.subscriptionType = cls.type;
  user.subscriptionStatus = "active";
  user.subscriptionSource = "paddle";
  user.subscriptionStartAt = new Date(data.created_at || Date.now());
  user.subscriptionExpiresAt = cls.expiresAt;
  user.subscriptionCreatedAt = new Date();
  user.paddleCustomerId = data.customer_id || data.customer?.id || user.paddleCustomerId;
  return true;
}

/* ------------------------------------------------------------------
   Direct verification (no webhook dependency). Called by the frontend
   right after Paddle checkout completes. Authenticated by the user's
   cookie/bearer; fetches the transaction from the Paddle API and applies
   the plan. Mirrors the reliable crypto-verify flow.
   POST /api/subscription/paddle-verify  { transactionId }
------------------------------------------------------------------- */
exports.verifyPaddleTransaction = async (req, res) => {
  try {
    const userId = req.cookies?.userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const { transactionId } = req.body || {};
    if (!transactionId) return res.status(400).json({ message: "transactionId required" });
    if (!process.env.PADDLE_API_KEY) return res.status(500).json({ message: "Paddle API key not configured" });

    const apiResp = await paddle.getTransaction(transactionId);
    const txn = apiResp?.data;
    if (!txn) return res.status(404).json({ message: "Transaction not found" });

    console.log(`[PADDLE-VERIFY] user=${userId} txn=${transactionId} status=${txn.status} custom_userId=${txn.custom_data?.userId || "none"}`);

    if (!["completed", "paid", "billed"].includes(txn.status)) {
      return res.status(202).json({ pending: true, status: txn.status });
    }

    // security: if the transaction carries a userId, it must be this user
    const txnUserId = txn.custom_data?.userId;
    if (txnUserId && String(txnUserId) !== String(userId)) {
      console.warn(`[PADDLE-VERIFY] txn userId ${txnUserId} != caller ${userId} — refusing`);
      return res.status(403).json({ message: "Transaction does not belong to this user" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const cls = classifyTransaction(txn);
    if (cls.plan === "free") return res.status(200).json({ changed: false, reason: "unrecognised-plan" });

    if (user.subscriptionPlan === "lifetime" && cls.plan !== "lifetime") {
      return res.status(200).json({ changed: false, plan: "lifetime", reason: "lifetime-sticky" });
    }

    const grandTotal = txn.details?.totals?.grand_total ?? txn.details?.totals?.total ?? "0";
    const order = await Order.create({
      userId: user._id,
      planId: cls.plan,
      amount: Number(grandTotal || 0) / 100,
      currency: txn.currency_code || "USD",
      period: cls.plan === "lifetime" ? "lifetime" : "monthly",
      paymentType: cls.type,
      status: "paid",
      meta: txn,
    });

    applyPlanToUser(user, cls, txn);
    user.orders.push({ orderId: order._id, status: "paid" });
    await user.save();

    console.log(`✅ [PADDLE-VERIFY] ${user.email} → ${cls.plan}/${cls.type}`);
    return res.json({ success: true, plan: cls.plan, type: cls.type });
  } catch (err) {
    console.error("❌ [PADDLE-VERIFY] error:", err?.response?.status, JSON.stringify(err?.response?.data) || err.message);
    return res.status(500).json({ message: "Verification failed" });
  }
};

exports.handlePaddleWebhook = async (req, res) => {
  console.log("━━━━━━━━━━ [PADDLE-WH] incoming webhook ━━━━━━━━━━");
  try {
    // 1️⃣ Verify signature
    const sigOk = verifyPaddleSignature(req);
    console.log(`[PADDLE-WH] signature valid: ${sigOk} | secret set: ${!!process.env.PADDLE_WEBHOOK_SECRET}`);
    if (!sigOk) {
      console.error("❌ [PADDLE-WH] Invalid Paddle signature — rejecting (check PADDLE_WEBHOOK_SECRET matches THIS destination)");
      return res.status(401).send("Invalid signature");
    }

    const event = JSON.parse(req.body.toString());
    console.log(`[PADDLE-WH] event_type: ${event.event_type} | event_id: ${event.event_id || "n/a"}`);

    // 2️⃣ Only handle successful payments
    if (event.event_type !== "transaction.completed") {
      console.log(`[PADDLE-WH] ignoring (not transaction.completed)`);
      return res.status(200).send("Ignored");
    }

    const data = event.data;
    console.log("[PADDLE-WH] txn diagnostics:", JSON.stringify({
      transactionId: data?.id,
      custom_data: data?.custom_data,
      customer_id: data?.customer_id,
      inline_customer_email: data?.customer?.email || null,
      priceId: data?.items?.[0]?.price?.id || data?.details?.line_items?.[0]?.price_id || null,
      billing_cycle: data?.items?.[0]?.price?.billing_cycle || null,
      currency: data?.currency_code,
      grand_total: data?.details?.totals?.grand_total,
      paddle_api_key_set: !!process.env.PADDLE_API_KEY,
      paddle_environment: process.env.PADDLE_ENVIRONMENT || "(unset → sandbox)",
    }));

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
      console.log(`[PADDLE-WH] lookup by custom_data.userId=${userId} → matched: ${!!user}`);
    } else {
      console.log("[PADDLE-WH] no custom_data.userId present (checkout didn't attach it)");
    }
    if (!user && customerEmail) {
      user = await User.findOne({ email: customerEmail });
      console.log(`[PADDLE-WH] lookup by inline email=${customerEmail} → matched: ${!!user}`);
    }
    // Last resort: the transaction payload has no email, only customer_id —
    // resolve the email via the Paddle API and match. Needs PADDLE_API_KEY +
    // PADDLE_ENVIRONMENT to match the environment the payment was made in.
    if (!user && data.customer_id && process.env.PADDLE_API_KEY) {
      try {
        console.log(`[PADDLE-WH] resolving email via Paddle API for customer_id=${data.customer_id} ...`);
        const cust = await paddle.getCustomer(data.customer_id);
        const apiEmail = (cust?.data?.email || "").toLowerCase();
        if (apiEmail) {
          user = await User.findOne({ email: apiEmail });
          console.log(`🔎 [PADDLE-WH] Paddle API → ${apiEmail} (user matched: ${!!user})`);
        } else {
          console.warn("[PADDLE-WH] Paddle API returned no email for that customer_id");
        }
      } catch (e) {
        console.error("❌ [PADDLE-WH] Paddle getCustomer failed:", e?.response?.status, JSON.stringify(e?.response?.data) || e.message);
      }
    } else if (!user && data.customer_id && !process.env.PADDLE_API_KEY) {
      console.warn("[PADDLE-WH] PADDLE_API_KEY not set → cannot resolve email from customer_id");
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

    // Lifetime is permanent: never let a later recurring/monthly event (e.g. an
    // old still-active subscription firing a renewal) downgrade a lifetime user.
    if (user.subscriptionPlan === "lifetime" && plan !== "lifetime") {
      console.log(`[PADDLE-WH] ${user.email} is already lifetime — ignoring ${plan}/${type} event (no downgrade).`);
      // still log the order for records, but don't touch the subscription
      await Order.create({
        userId: user._id,
        planId: plan,
        amount: Number((data.details?.totals?.grand_total ?? data.details?.totals?.total) || 0) / 100,
        currency: data.currency_code || "USD",
        period: plan === "lifetime" ? "lifetime" : "monthly",
        paymentType: type,
        status: "paid",
        meta: data,
      }).catch(() => {});
      return res.status(200).json({ received: true, matched: true, changed: false, reason: "lifetime-sticky" });
    }

    // 4️⃣ Create Order — totals live under data.details.totals (top-level
    // data.totals does NOT exist on transaction.completed; reading it crashes).
    const grandTotal = data.details?.totals?.grand_total ?? data.details?.totals?.total ?? "0";
    console.log(`[PADDLE-WH] creating order for ${user.email}: plan=${plan} type=${type} amount=${Number(grandTotal || 0) / 100} ${data.currency_code}`);
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

    console.log(`✅ [PADDLE-WH] User subscription updated: ${user.email} → ${plan}/${type} (status active)`);

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("❌ [PADDLE-WH] handler error:", err?.message);
    console.error(err?.stack || err);
    res.status(500).send("Webhook error");
  }
};
