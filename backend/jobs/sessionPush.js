/* Session-open push reminders (in-process scheduler).

   At the start of each major market session (UTC), pushes a "log a trade"
   notification to every stored subscription — delivered even when the user's
   browser/PWA is closed (via the service worker).

   No external scheduler: a 60s interval checks for boundary crossings and
   de-dupes per session-hour in memory. Assumes a single always-on instance
   (Railway). Gate to one worker if you scale horizontally.

   Env:
     PUSH_REMINDERS_ENABLED = "false" to disable (default enabled)
     VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY must be set (else it no-ops) */

const { isPushConfigured } = require("../utils/webPush");
const { sendSessionReminderToAll } = require("../controllers/pushController");

// UTC session-start hours → names (matches the frontend detectSession buckets)
const SESSION_STARTS = [
  { h: 0, name: "Asia session" },
  { h: 7, name: "London session" },
  { h: 13, name: "New York session" },
  { h: 21, name: "Sydney session" },
];

let lastKey = null; // `${yyyy-mm-dd}#${hour}` of the last reminder sent

async function tick() {
  if (!isPushConfigured()) return;
  const now = new Date();
  const h = now.getUTCHours();
  const m = now.getUTCMinutes();
  const session = SESSION_STARTS.find((s) => s.h === h);
  if (!session || m > 4) return; // only in the first few minutes of the hour

  const key = `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}#${h}`;
  if (key === lastKey) return; // already sent this session today
  lastKey = key;

  try {
    const n = await sendSessionReminderToAll(session.name);
    if (n > 0) console.log(`[push] ${session.name}: sent ${n} reminder(s)`);
  } catch (err) {
    console.error("[push] session reminder error:", err?.message || err);
  }
}

function startSessionPushScheduler() {
  if (String(process.env.PUSH_REMINDERS_ENABLED).toLowerCase() === "false") {
    console.log("[push] reminders disabled via PUSH_REMINDERS_ENABLED=false");
    return;
  }
  if (!isPushConfigured()) {
    console.warn("[push] VAPID keys not set — session push scheduler not started");
    return;
  }
  setInterval(tick, 60 * 1000);
  console.log("[push] session reminder scheduler started");
}

module.exports = { startSessionPushScheduler, tick };
