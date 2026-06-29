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

// Core classifier shared by transactions and subscriptions.
//   - One-time / lifetime prices have billing_cycle: null.
//   - Recurring prices have billing_cycle.interval = "month" | "year".
//   - A record that belongs to a subscription is NEVER lifetime, even if we
//     can't see its billing_cycle (Paddle doesn't always expand it).
function classifyByPrice({ priceId, billingCycle, endsAt, isSubscription }) {
  const isMonthlyId = !!priceId && priceId === process.env.PADDLE_MONTHLY_PRICE_ID;
  const isYearlyId = !!priceId && priceId === process.env.PADDLE_YEARLY_PRICE_ID;
  const isLifetimeId = !!priceId && priceId === process.env.PADDLE_LIFETIME_PRICE_ID;

  // RECURRING first — anything that's a subscription, a known monthly/yearly
  // price, or carries a billing cycle. (Checked before lifetime so a
  // subscription can NEVER be mistaken for lifetime.)
  if (isSubscription || isMonthlyId || isYearlyId || billingCycle?.interval === "month" || billingCycle?.interval === "year") {
    return { plan: "pro", type: "recurring", expiresAt: endsAt || null };
  }
  // LIFETIME only for the explicit lifetime price — never "assume" lifetime for
  // an unknown one-time price (that's what wrongly upgraded monthly buyers).
  if (isLifetimeId) {
    return { plan: "lifetime", type: "lifetime", expiresAt: null };
  }
  // Unknown / unrecognised price → don't change anything; log upstream.
  return { plan: "free", type: "none", expiresAt: null };
}

// Map a Paddle TRANSACTION object → our plan/type/expiry.
function classifyTransaction(data) {
  const item = data.items?.[0] || {};
  const priceId = item.price?.id || data.details?.line_items?.[0]?.price_id;
  const billingCycle = item.price?.billing_cycle || data.details?.line_items?.[0]?.price?.billing_cycle;
  const endsAt = data.billing_period?.ends_at ? new Date(data.billing_period.ends_at) : null;
  // A transaction is recurring if it's tied to a subscription OR carries a
  // billing_period (Paddle sets this only for subscription charges) OR has a
  // billing_cycle on its price. Any of these → recurring, never lifetime.
  const isSubscription = !!data.subscription_id || !!data.billing_period;
  return { ...classifyByPrice({ priceId, billingCycle, endsAt, isSubscription }), priceId, billingCycle };
}

// Map a Paddle SUBSCRIPTION object → our plan/type/expiry/status.
function classifySubscription(sub) {
  const item = sub.items?.[0] || {};
  const priceId = item.price?.id;
  const billingCycle = item.price?.billing_cycle;
  const endsAt =
    sub.current_billing_period?.ends_at ? new Date(sub.current_billing_period.ends_at)
    : sub.next_billed_at ? new Date(sub.next_billed_at)
    : null;
  const cls = classifyByPrice({ priceId, billingCycle, endsAt, isSubscription: true });
  // Paddle subscription statuses: active | trialing | past_due | paused | canceled
  const active = sub.status === "active" || sub.status === "trialing";
  return { ...cls, priceId, expiresAt: endsAt, subStatus: sub.status, active };
}

// Resolve our User from a webhook/transaction/subscription payload:
//   custom_data.userId → customer email (inline) → Paddle API by customer_id.
async function resolveUserFromData(data) {
  const userId = data.custom_data?.userId;
  if (userId) {
    try { const u = await User.findById(userId); if (u) return u; } catch { /* invalid id */ }
  }
  const inlineEmail = (data.customer?.email || "").toLowerCase();
  if (inlineEmail) {
    const u = await User.findOne({ email: inlineEmail });
    if (u) return u;
  }
  if (data.customer_id && process.env.PADDLE_API_KEY) {
    try {
      const cust = await paddle.getCustomer(data.customer_id);
      const apiEmail = (cust?.data?.email || "").toLowerCase();
      if (apiEmail) return await User.findOne({ email: apiEmail });
    } catch (e) {
      console.error("[PADDLE] getCustomer failed:", e?.response?.status, e?.message);
    }
  }
  return null;
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

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // A subscription's first transaction can still be `ready`/`billed` and its
    // `subscription_id` can populate a beat AFTER the browser fires
    // checkout.completed. A single immediate read therefore races the
    // subscription's creation (this is exactly why monthly/yearly looked like
    // they "didn't activate" while one-time lifetime did). So poll briefly:
    // fetch the transaction, and if it belongs to a subscription confirm via
    // the subscription object; otherwise classify a completed transaction.
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    let txn = null;
    let cls = null;
    let lastStatus = "unknown";

    for (let attempt = 0; attempt < 4 && !cls; attempt++) {
      if (attempt > 0) await sleep(1500);
      try {
        txn = (await paddle.getTransaction(transactionId))?.data || null;
      } catch (e) {
        console.error("[PADDLE-VERIFY] getTransaction failed:", e?.response?.status, e?.message);
        continue;
      }
      if (!txn) continue;
      lastStatus = txn.status;

      // security: a txn carrying a userId must belong to this user
      const txnUserId = txn.custom_data?.userId;
      if (txnUserId && String(txnUserId) !== String(userId)) {
        console.warn(`[PADDLE-VERIFY] txn userId ${txnUserId} != caller ${userId} — refusing`);
        return res.status(403).json({ message: "Transaction does not belong to this user" });
      }

      // Verbose diagnostics — shows EXACTLY what we're classifying against, so
      // a failing monthly/yearly reveals its cause (price id mismatch, missing
      // billing_cycle, wrong env, etc.) right here in the logs.
      const dItem = txn.items?.[0] || {};
      console.log(`[PADDLE-VERIFY] try#${attempt} txn=${transactionId}`, JSON.stringify({
        status: txn.status,
        subscription_id: txn.subscription_id || null,
        has_billing_period: !!txn.billing_period,
        priceId: dItem.price?.id || txn.details?.line_items?.[0]?.price_id || null,
        billing_cycle: dItem.price?.billing_cycle || null,
        env_monthly: process.env.PADDLE_MONTHLY_PRICE_ID || "(unset)",
        env_yearly: process.env.PADDLE_YEARLY_PRICE_ID || "(unset)",
        env_lifetime: process.env.PADDLE_LIFETIME_PRICE_ID || "(unset)",
      }));

      // recurring → confirm via the subscription (active/trialing = authorized)
      if (txn.subscription_id) {
        try {
          const sub = (await paddle.getSubscription(txn.subscription_id))?.data;
          if (sub) {
            const sc = classifySubscription(sub);
            console.log(`[PADDLE-VERIFY] sub ${txn.subscription_id} status=${sub.status} → ${sc.plan}/${sc.type} active=${sc.active}`);
            if (sc.active && sc.plan !== "free") cls = sc;
          }
        } catch (e) {
          console.error("[PADDLE-VERIFY] getSubscription failed:", e?.response?.status, e?.message);
        }
      }

      // one-time (lifetime) or recurring fallback: a completed txn we can map
      if (!cls && ["completed", "paid", "billed"].includes(txn.status)) {
        const c = classifyTransaction(txn);
        if (c.plan !== "free") cls = c;
      }
    }

    // Still not resolved → tell the client it's pending; the webhook
    // (subscription.activated / transaction.completed) is the backstop, and the
    // success screen keeps polling user-info.
    if (!cls) return res.status(202).json({ pending: true, status: lastStatus });

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

    const data = event.data;

    // 2️⃣a Subscription lifecycle — this is how monthly/yearly get authorised.
    //     Paddle confirms a recurring plan via subscription.activated/created/
    //     updated (the first charge's transaction.completed also fires, handled
    //     below, but the subscription event is the authoritative signal).
    const SUB_EVENTS = [
      "subscription.activated",
      "subscription.created",
      "subscription.updated",
      "subscription.canceled",
    ];
    if (SUB_EVENTS.includes(event.event_type)) {
      const sub = data;
      console.log(`[PADDLE-WH] ${event.event_type} sub=${sub.id} status=${sub.status} custom=${sub.custom_data?.userId || "none"} cust=${sub.customer_id || "none"}`);
      const subUser = await resolveUserFromData(sub);
      if (!subUser) {
        console.warn(`⚠️ [PADDLE-WH] ${event.event_type}: no matching user — ignoring.`);
        return res.status(200).json({ received: true, matched: false });
      }
      // never downgrade a lifetime user from a recurring event
      if (subUser.subscriptionPlan === "lifetime") {
        console.log(`[PADDLE-WH] ${subUser.email} is lifetime — ignoring ${event.event_type}.`);
        return res.status(200).json({ received: true, changed: false, reason: "lifetime-sticky" });
      }
      const sc = classifySubscription(sub);
      if (sc.plan === "free") {
        console.warn(`⚠️ [PADDLE-WH] ${event.event_type}: unrecognised price ${sc.priceId} — not changing ${subUser.email}.`);
        return res.status(200).json({ received: true, changed: false });
      }

      // Map Paddle's subscription status → our access state, applying downgrades.
      //   active / trialing / past_due → Pro active (past_due = payment-retry grace)
      //   paused / canceled            → downgrade to free/expired
      let nPlan = sc.plan;        // "pro"
      let nType = sc.type;        // "recurring"
      let nStatus;
      const st = (sub.status || "").toLowerCase();
      if (st === "active" || st === "trialing" || st === "past_due") {
        nStatus = "active";
      } else if (st === "paused" || st === "canceled") {
        nPlan = "free"; nType = "none"; nStatus = "expired";   // ← downgrade
      } else {
        nStatus = "active";
      }

      subUser.subscriptionPlan = nPlan;
      subUser.subscriptionType = nType;
      subUser.subscriptionStatus = nStatus;
      subUser.subscriptionSource = "paddle";
      const startSrc = sub.started_at || sub.first_billed_at || sub.created_at;
      if (startSrc) subUser.subscriptionStartAt = new Date(startSrc);
      subUser.subscriptionExpiresAt = sc.expiresAt;            // period end (kept for history)
      subUser.subscriptionCreatedAt = new Date();
      if (sub.next_billed_at) subUser.nextBillingDate = new Date(sub.next_billed_at);
      subUser.paddleCustomerId = sub.customer_id || subUser.paddleCustomerId;
      subUser.paddleSubscriptionId = sub.id || subUser.paddleSubscriptionId;
      await subUser.save();
      console.log(`✅ [PADDLE-WH] ${event.event_type}: ${subUser.email} → ${nPlan}/${nType} status=${nStatus} expires=${sc.expiresAt || "—"} (paddle status=${st})`);
      return res.status(200).json({ received: true, changed: true });
    }

    // 2️⃣b One-time / first-charge payments
    if (event.event_type !== "transaction.completed") {
      console.log(`[PADDLE-WH] ignoring (${event.event_type})`);
      return res.status(200).send("Ignored");
    }
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

    // 3️⃣ Determine plan (subscription-aware: a txn with a subscription_id is
    //     recurring, never lifetime — even if the price/billing_cycle isn't
    //     expanded in this payload).
    const cls = classifyTransaction(data);
    const { plan, type, expiresAt, priceId, billingCycle } = cls;

    console.log(
      `🧾 Paddle txn — priceId=${priceId} cycle=${billingCycle?.interval || "none"} sub=${data.subscription_id || "none"} → plan=${plan}/${type}`,
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
    if (data.subscription_id) user.paddleSubscriptionId = data.subscription_id;

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
