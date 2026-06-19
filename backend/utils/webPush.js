/* web-push configuration + a safe send helper.

   Requires env:
     VAPID_PUBLIC_KEY   — public VAPID key (also served to the client)
     VAPID_PRIVATE_KEY  — private VAPID key (secret)
     VAPID_SUBJECT      — contact, e.g. "mailto:support@journalx.app" (optional) */

const webpush = require("web-push");

const PUBLIC = process.env.VAPID_PUBLIC_KEY || "";
const PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:support@journalx.app";

let configured = false;
if (PUBLIC && PRIVATE) {
  try {
    webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);
    configured = true;
  } catch (e) {
    console.error("[push] VAPID config failed:", e?.message || e);
  }
}

const isPushConfigured = () => configured;
const getPublicKey = () => PUBLIC;

/* Send a JSON payload to one subscription.
   Returns { ok } on success, or { gone:true } when the subscription is no
   longer valid (404/410) so the caller can delete it. */
async function sendPush(sub, payload) {
  if (!configured) return { ok: false, error: "not-configured" };
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: sub.keys },
      JSON.stringify(payload),
      { TTL: 1800 },
    );
    return { ok: true };
  } catch (err) {
    const code = err?.statusCode;
    if (code === 404 || code === 410) return { ok: false, gone: true };
    return { ok: false, error: err?.body || err?.message || "send-failed" };
  }
}

module.exports = { sendPush, isPushConfigured, getPublicKey };
