const crypto = require("crypto");
const User = require("../models/User");
const Order = require("../models/Orders");
const { paddle } = require("../utils/paddle");
const PaddleEvent = require("../models/PaddleEvent");

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
    const period = isYearlyId || billingCycle?.interval === "year" ? "yearly" : "monthly";
    return { plan: "pro", type: "recurring", expiresAt: endsAt || null, period };
  }
  // LIFETIME only for the explicit lifetime price — never "assume" lifetime for
  // an unknown one-time price (that's what wrongly upgraded monthly buyers).
  if (isLifetimeId) {
    return { plan: "lifetime", type: "lifetime", expiresAt: null, period: "lifetime" };
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

/* Idempotent order record for a Paddle transaction: the webhook, its retries
   and the browser-side verify can all see the same transaction, so we key on
   the Paddle transaction id and never create a second order for it. */
async function recordPaddleOrder(user, cls, txn) {
  if (txn?.id) {
    const existing = await Order.findOne({ "meta.id": txn.id });
    if (existing) return { order: existing, created: false };
  }
  const grandTotal = txn?.details?.totals?.grand_total ?? txn?.details?.totals?.total ?? "0";
  const order = await Order.create({
    userId: user._id,
    planId: cls.plan,
    amount: Number(grandTotal || 0) / 100,
    currency: txn?.currency_code || "USD",
    method: "card",
    period: cls.period || (cls.plan === "lifetime" ? "lifetime" : "monthly"),
    paymentType: cls.type,
    status: "paid",
    meta: txn || {},
  });
  user.orders.push({ orderId: order._id, status: "paid" });
  return { order, created: true };
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
    let ownerChecked = false;

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
      // no userId on the transaction: only the buyer (same email) may claim it
      if (!txnUserId && !ownerChecked) {
        ownerChecked = true;
        let buyerEmail = (txn.customer?.email || "").toLowerCase();
        if (!buyerEmail && txn.customer_id) {
          try { buyerEmail = ((await paddle.getCustomer(txn.customer_id))?.data?.email || "").toLowerCase(); } catch { /* checked below */ }
        }
        if (!buyerEmail || buyerEmail !== String(user.email || "").toLowerCase()) {
          console.warn(`[PADDLE-VERIFY] txn ${transactionId} has no userId and buyer email doesn't match caller — refusing`);
          return res.status(403).json({ message: "Transaction does not belong to this user" });
        }
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

    await recordPaddleOrder(user, cls, txn);
    applyPlanToUser(user, cls, txn);
    if (txn.subscription_id) user.paddleSubscriptionId = txn.subscription_id;
    await user.save();

    console.log(`✅ [PADDLE-VERIFY] ${user.email} → ${cls.plan}/${cls.type}`);
    return res.json({ success: true, plan: cls.plan, type: cls.type });
  } catch (err) {
    console.error("❌ [PADDLE-VERIFY] error:", err?.response?.status, JSON.stringify(err?.response?.data) || err.message);
    return res.status(500).json({ message: "Verification failed" });
  }
};

/* ------------------------------------------------------------------
   Webhook processing. Paddle wants a 200 within 5 seconds and delivers
   at-least-once, in no guaranteed order. So the HTTP handler only verifies
   the signature, stores the event (deduped by event_id) and acks; the work
   happens in processPaddleEvent(), which the reconciler can safely re-run.
------------------------------------------------------------------- */
const SUB_EVENTS = [
  "subscription.created",
  "subscription.activated",
  "subscription.updated",
  "subscription.trialing",
  "subscription.past_due",
  "subscription.paused",
  "subscription.resumed",
  "subscription.canceled",
];

// returns { status: processed|ignored|unmatched, userId?, note? }
async function processPaddleEvent(event) {
  const data = event.data || {};
  const occurredAt = event.occurred_at ? new Date(event.occurred_at) : null;

  // ---- subscription lifecycle (authoritative for monthly / yearly) ----
  if (SUB_EVENTS.includes(event.event_type)) {
    const sub = data;
    console.log(`[PADDLE-WH] ${event.event_type} sub=${sub.id} status=${sub.status} custom=${sub.custom_data?.userId || "none"} cust=${sub.customer_id || "none"}`);
    const subUser = await resolveUserFromData(sub);
    if (!subUser) return { status: "unmatched", note: "no user for subscription" };
    if (subUser.subscriptionPlan === "lifetime") return { status: "ignored", userId: subUser._id, note: "lifetime-sticky" };

    // out-of-order guard: never let an older event overwrite a newer state
    if (occurredAt && subUser.paddleLastSubEventAt && occurredAt <= subUser.paddleLastSubEventAt) {
      console.log(`[PADDLE-WH] ${event.event_type} older than last applied (${subUser.paddleLastSubEventAt.toISOString()}) — skipping`);
      return { status: "ignored", userId: subUser._id, note: "stale (out of order)" };
    }

    const sc = classifySubscription(sub);
    if (sc.plan === "free") return { status: "ignored", userId: subUser._id, note: `unrecognised price ${sc.priceId}` };

    //   active / trialing / past_due → Pro (past_due = payment-retry grace)
    //   paused / canceled            → downgrade
    let nPlan = sc.plan, nType = sc.type, nStatus = "active";
    const st = (sub.status || "").toLowerCase();
    if (st === "paused" || st === "canceled") { nPlan = "free"; nType = "none"; nStatus = "expired"; }

    subUser.subscriptionPlan = nPlan;
    subUser.subscriptionType = nType;
    subUser.subscriptionStatus = nStatus;
    subUser.subscriptionSource = "paddle";
    const startSrc = sub.started_at || sub.first_billed_at || sub.created_at;
    if (startSrc) subUser.subscriptionStartAt = new Date(startSrc);
    // a scheduled cancel keeps access until it takes effect
    const cancelAt = sub.scheduled_change?.action === "cancel" && sub.scheduled_change?.effective_at ? new Date(sub.scheduled_change.effective_at) : null;
    subUser.subscriptionExpiresAt = cancelAt || sc.expiresAt;
    subUser.subscriptionCreatedAt = new Date();
    subUser.nextBillingDate = sub.next_billed_at ? new Date(sub.next_billed_at) : undefined;
    subUser.paddleCustomerId = sub.customer_id || subUser.paddleCustomerId;
    subUser.paddleSubscriptionId = sub.id || subUser.paddleSubscriptionId;
    if (occurredAt) subUser.paddleLastSubEventAt = occurredAt;
    await subUser.save();
    console.log(`✅ [PADDLE-WH] ${event.event_type}: ${subUser.email} → ${nPlan}/${nType} status=${nStatus} (paddle=${st})`);
    return { status: "processed", userId: subUser._id };
  }

  // ---- payments (one-time lifetime + every subscription charge) ----
  if (event.event_type !== "transaction.completed") return { status: "ignored", note: "event type not used" };

  console.log("[PADDLE-WH] txn diagnostics:", JSON.stringify({
    transactionId: data?.id,
    custom_data: data?.custom_data,
    customer_id: data?.customer_id,
    priceId: data?.items?.[0]?.price?.id || data?.details?.line_items?.[0]?.price_id || null,
    billing_cycle: data?.items?.[0]?.price?.billing_cycle || null,
    subscription_id: data?.subscription_id || null,
    origin: data?.origin || null,
    grand_total: data?.details?.totals?.grand_total,
  }));

  // a payment-method update has no new purchase in it
  if (data.origin === "subscription_payment_method_change") return { status: "ignored", note: "payment method change" };

  const user = await resolveUserFromData(data);
  if (!user) return { status: "unmatched", note: `no user (userId=${data.custom_data?.userId || "none"}, customer=${data.customer_id || "none"})` };

  const cls = classifyTransaction(data);
  if (cls.plan === "free") return { status: "ignored", userId: user._id, note: `unrecognised price ${cls.priceId}` };

  // lifetime is permanent; still keep the order for records
  if (user.subscriptionPlan === "lifetime" && cls.plan !== "lifetime") {
    await recordPaddleOrder(user, cls, data);
    await user.save();
    return { status: "ignored", userId: user._id, note: "lifetime-sticky (order recorded)" };
  }

  await recordPaddleOrder(user, cls, data);
  user.subscriptionPlan = cls.plan;
  user.subscriptionType = cls.type;
  user.subscriptionStatus = "active";
  user.subscriptionSource = "paddle";
  user.subscriptionStartAt = new Date(data.created_at || Date.now());
  // a renewal extends access to the new period end; never shorten it
  if (cls.expiresAt && (!user.subscriptionExpiresAt || cls.expiresAt > user.subscriptionExpiresAt)) user.subscriptionExpiresAt = cls.expiresAt;
  if (cls.plan === "lifetime") user.subscriptionExpiresAt = null;
  user.subscriptionCreatedAt = new Date();
  user.lastBillingDate = new Date(data.billed_at || data.created_at || Date.now());
  user.paddleCustomerId = data.customer_id || data.customer?.id || user.paddleCustomerId;
  if (data.subscription_id) user.paddleSubscriptionId = data.subscription_id;
  await user.save();
  console.log(`✅ [PADDLE-WH] ${user.email} → ${cls.plan}/${cls.type} (txn ${data.id})`);
  return { status: "processed", userId: user._id };
}

// Run one stored event and record the outcome.
async function runStoredEvent(doc) {
  try {
    doc.attempts = (doc.attempts || 0) + 1;
    const r = await processPaddleEvent(doc.payload);
    doc.status = r.status;
    doc.userId = r.userId || doc.userId;
    doc.note = r.note;
    doc.lastError = undefined;
  } catch (err) {
    doc.status = "error";
    doc.lastError = String(err?.message || err).slice(0, 500);
    console.error(`❌ [PADDLE-WH] processing ${doc.eventId} failed:`, err?.message);
  }
  await doc.save().catch((e) => console.error("[PADDLE-WH] could not save event state:", e?.message));
  return doc.status;
}

exports.handlePaddleWebhook = async (req, res) => {
  try {
    if (!verifyPaddleSignature(req)) {
      console.error("❌ [PADDLE-WH] Invalid Paddle signature — rejecting (check PADDLE_WEBHOOK_SECRET matches THIS destination)");
      return res.status(401).send("Invalid signature");
    }
    let event;
    try { event = JSON.parse(req.body.toString()); } catch { return res.status(400).send("Bad JSON"); }
    const eventId = event.event_id || event.notification_id;
    console.log(`[PADDLE-WH] ${event.event_type} | event_id ${eventId || "n/a"}`);
    if (!eventId) return res.status(400).send("Missing event_id");

    // store once; a retry of an event we already handled is acked and skipped
    let doc = await PaddleEvent.findOne({ eventId });
    if (doc && ["processed", "ignored"].includes(doc.status)) {
      return res.status(200).json({ received: true, duplicate: true });
    }
    if (!doc) {
      try {
        doc = await PaddleEvent.create({
          eventId,
          eventType: event.event_type,
          occurredAt: event.occurred_at ? new Date(event.occurred_at) : undefined,
          payload: event,
        });
      } catch (e) {
        // two deliveries racing on the unique index — the other one owns it
        if (e?.code === 11000) return res.status(200).json({ received: true, duplicate: true });
        throw e;
      }
    }

    // ack within Paddle's 5s window, then do the work
    res.status(200).json({ received: true });
    setImmediate(() => { runStoredEvent(doc); });
  } catch (err) {
    console.error("❌ [PADDLE-WH] handler error:", err?.message);
    // not stored → let Paddle retry
    if (!res.headersSent) res.status(500).send("Webhook error");
  }
};

/* Reconciler: re-runs events that errored, never finished (server restart
   between ack and processing), or couldn't be matched yet (the buyer may sign
   up or fix their email later). Runs every 5 minutes. */
async function reconcilePaddleEvents() {
  const now = Date.now();
  const docs = await PaddleEvent.find({
    $or: [
      { status: "received", createdAt: { $lt: new Date(now - 60 * 1000) } },
      { status: "error", attempts: { $lt: 10 } },
      { status: "unmatched", attempts: { $lt: 12 }, createdAt: { $gt: new Date(now - 72 * 3600 * 1000) } },
    ],
  }).sort({ occurredAt: 1 }).limit(50);
  for (const d of docs) await runStoredEvent(d);
  if (docs.length) console.log(`[PADDLE-RECONCILE] re-ran ${docs.length} event(s)`);
}

exports.startPaddleReconciler = () => {
  if (!process.env.PADDLE_ENVIRONMENT) {
    console.warn("⚠️ [PADDLE] PADDLE_ENVIRONMENT is not set → backend talks to the SANDBOX API. Set it to 'production' on the live server or every live verify/getCustomer call will 404.");
  }
  const tick = () => reconcilePaddleEvents().catch((e) => console.error("[PADDLE-RECONCILE] failed:", e?.message));
  setTimeout(tick, 30 * 1000);
  setInterval(tick, 5 * 60 * 1000);
};

exports._internals = { processPaddleEvent, classifyTransaction, classifySubscription, verifyPaddleSignature };
