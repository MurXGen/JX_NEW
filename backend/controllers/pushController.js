const PushSubscription = require("../models/PushSubscription");
const { sendPush, isPushConfigured, getPublicKey } = require("../utils/webPush");

/* GET /api/push/public-key → the VAPID public key the client subscribes with */
const publicKey = (req, res) => {
  if (!isPushConfigured()) return res.status(503).json({ message: "Push not configured" });
  res.json({ publicKey: getPublicKey() });
};

/* POST /api/push/subscribe { subscription } — upsert by endpoint */
const subscribe = async (req, res) => {
  try {
    const userId = req.cookies.userId;
    const sub = req.body?.subscription || req.body;
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      return res.status(400).json({ message: "Invalid subscription" });
    }
    await PushSubscription.findOneAndUpdate(
      { endpoint: sub.endpoint },
      {
        $set: {
          userId: userId || undefined,
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
          userAgent: req.headers["user-agent"] || "",
          enabled: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("[push] subscribe error:", err?.message || err);
    res.status(500).json({ message: "Could not save subscription" });
  }
};

/* POST /api/push/unsubscribe { endpoint } */
const unsubscribe = async (req, res) => {
  try {
    const endpoint = req.body?.endpoint;
    if (!endpoint) return res.status(400).json({ message: "endpoint required" });
    await PushSubscription.deleteOne({ endpoint });
    res.json({ ok: true });
  } catch (err) {
    console.error("[push] unsubscribe error:", err?.message || err);
    res.status(500).json({ message: "Could not remove subscription" });
  }
};

/* POST /api/push/test — send a test push to the caller's devices (handy for QA) */
const sendTest = async (req, res) => {
  try {
    const userId = req.cookies.userId;
    if (!userId) return res.status(401).json({ message: "Not signed in" });
    const subs = await PushSubscription.find({ userId, enabled: true });
    await deliver(subs, {
      title: "🔔 JournalX test notification",
      body: "Push is working — you'll get a nudge at each session open.",
      url: "/dashboard",
    });
    res.json({ ok: true, devices: subs.length });
  } catch (err) {
    res.status(500).json({ message: "Test failed" });
  }
};

/* deliver a payload to many subscriptions, pruning dead ones */
async function deliver(subs, payload) {
  let sent = 0;
  for (const s of subs) {
    const r = await sendPush(s, payload);
    if (r.ok) {
      sent += 1;
      s.lastSentAt = new Date();
      s.save().catch(() => {});
    } else if (r.gone) {
      PushSubscription.deleteOne({ _id: s._id }).catch(() => {});
    }
  }
  return sent;
}

/* used by the scheduler — push a session-open reminder to everyone */
async function sendSessionReminderToAll(sessionName) {
  if (!isPushConfigured()) return 0;
  const subs = await PushSubscription.find({ enabled: true });
  return deliver(subs, {
    title: `📈 ${sessionName} is open`,
    body: "A new session just started — log any trades and review your plan.",
    url: "/dashboard",
    tag: `session-${sessionName}`,
  });
}

module.exports = { publicKey, subscribe, unsubscribe, sendTest, sendSessionReminderToAll };
