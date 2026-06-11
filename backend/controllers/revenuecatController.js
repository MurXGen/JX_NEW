/* RevenueCat webhook — keeps our subscription state in sync with Google Play
   purchases made in the mobile app. RevenueCat is the source of truth for the
   "pro" entitlement; this just mirrors it onto the User document so the same
   subscription fields the web/Paddle flow uses stay correct.

   Setup: in RevenueCat → Project → Integrations → Webhooks, point it at
   POST /api/payments/revenuecat/webhook and set the Authorization header to
   the value of REVENUECAT_WEBHOOK_SECRET. We require app_user_id === our
   Mongo userId (the app calls Purchases.logIn(userId)). */
const User = require("../models/User");
const { sendTelegramNotification } = require("../utils/telegramNotifier");

// event types that mean the user currently HAS access
const ACTIVE_EVENTS = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "PRODUCT_CHANGE",
  "UNCANCELLATION",
  "NON_RENEWING_PURCHASE",
]);
// event types that revoke access
const INACTIVE_EVENTS = new Set(["EXPIRATION", "BILLING_ISSUE"]);

const revenuecatWebhook = async (req, res) => {
  try {
    // verify shared secret
    const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
    const auth = req.headers.authorization || "";
    if (secret && auth !== secret && auth !== `Bearer ${secret}`) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const event = req.body && req.body.event;
    if (!event) return res.status(400).json({ message: "No event" });

    const userId = event.app_user_id;
    if (!userId) return res.status(200).json({ message: "No app_user_id — ignored" });

    const user = await User.findById(userId);
    if (!user) return res.status(200).json({ message: "User not found — ignored" });

    const type = event.type;
    const expiresMs = event.expiration_at_ms || event.expiration_at || null;
    const expiresAt = expiresMs ? new Date(Number(expiresMs)) : null;

    if (ACTIVE_EVENTS.has(type)) {
      user.subscriptionPlan = "pro";
      user.subscriptionStatus = "active";
      user.subscriptionType = "recurring";
      user.subscriptionSource = "play";
      user.subscriptionStartAt = user.subscriptionStartAt || new Date();
      if (expiresAt) user.subscriptionExpiresAt = expiresAt;
      user.lastBillingDate = new Date();
      if (expiresAt) user.nextBillingDate = expiresAt;
      await user.save();
      await sendTelegramNotification({
        name: user.name,
        email: user.email,
        type: "subscription",
        status: `Play ${type}`,
      }).catch(() => {});
    } else if (type === "CANCELLATION") {
      // user turned off auto-renew but keeps access until expiry
      user.subscriptionStatus = "canceled";
      await user.save();
    } else if (INACTIVE_EVENTS.has(type)) {
      // only downgrade if it was a Play subscription (don't clobber Paddle)
      if (user.subscriptionSource === "play") {
        user.subscriptionStatus = "expired";
        user.subscriptionPlan = "free";
        user.subscriptionType = "none";
      }
      await user.save();
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("RevenueCat webhook error:", err.message);
    // 200 so RevenueCat doesn't hammer retries on our bugs; we log it
    return res.status(200).json({ ok: false });
  }
};

module.exports = { revenuecatWebhook };
