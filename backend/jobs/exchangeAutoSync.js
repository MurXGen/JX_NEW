/* Background exchange auto-sync (in-process scheduler).

   Tradovate's API only exposes the CURRENT trading session, so its trades must
   be collected while they're still there — we can't wait for the user to open
   the dashboard. Every run syncs each Pro user's connected, auto-sync-enabled
   Tradovate connection (dedup by externalId makes overlap harmless).

   The run interval (default 60 min) is kept under Tradovate's 90-minute token
   life so the cached session is RENEWED rather than replaced — a fresh login
   opens a new Tradovate session and only 2 are allowed at once.

   Same single-instance assumption as the onboarding scheduler. Local runs are
   off unless EXCHANGE_SYNC_LIVE=true (local .env files point at real data).

   Env:
     EXCHANGE_SYNC_ENABLED = "false" to disable
     EXCHANGE_SYNC_INTERVAL_MIN = minutes between runs (default 60, 15–80)
     EXCHANGE_SYNC_LIVE = "true" to force-enable outside Railway */

const User = require("../models/User");
const { runSync, isPro } = require("../controllers/exchangeController");

const AUTO_EXCHANGES = ["tradovate"];
let running = false;

function isLiveEnv() {
  const flag = String(process.env.EXCHANGE_SYNC_LIVE || "").toLowerCase();
  if (flag === "true") return true;
  if (flag === "false") return false;
  return !!(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID || process.env.RAILWAY_SERVICE_ID);
}

async function runExchangeAutoSync() {
  if (running) return;
  running = true;
  const started = Date.now();
  let users = 0, imported = 0, failed = 0;
  try {
    for (const id of AUTO_EXCHANGES) {
      const cursor = User.find({
        [`integrations.${id}.connected`]: true,
        [`integrations.${id}.autoSync`]: { $ne: false },
      }).cursor();
      for await (const user of cursor) {
        if (!isPro(user)) continue;
        users++;
        try {
          const r = await runSync(user, id);
          imported += r.imported;
        } catch (e) {
          failed++;
          console.warn(`[exchange-sync] ${id} sync failed for user ${user._id}: ${e.code || ""} ${e.message}`);
        }
      }
    }
  } catch (e) {
    console.error("[exchange-sync] run failed:", e.message);
  } finally {
    running = false;
    if (users) console.log(`[exchange-sync] ${users} connection(s), ${imported} new trade(s), ${failed} failed, ${Date.now() - started}ms`);
  }
}

function startExchangeAutoSync() {
  if (String(process.env.EXCHANGE_SYNC_ENABLED).toLowerCase() === "false") {
    console.log("[exchange-sync] disabled via EXCHANGE_SYNC_ENABLED=false");
    return;
  }
  if (!isLiveEnv()) {
    console.log("[exchange-sync] non-live env (local) — not started. Set EXCHANGE_SYNC_LIVE=true to enable.");
    return;
  }
  const raw = parseInt(process.env.EXCHANGE_SYNC_INTERVAL_MIN || "60", 10) || 60;
  const minutes = Math.min(80, Math.max(15, raw));
  setTimeout(runExchangeAutoSync, 2 * 60 * 1000);
  setInterval(runExchangeAutoSync, minutes * 60 * 1000);
  console.log(`[exchange-sync] started — every ${minutes} min (${AUTO_EXCHANGES.join(", ")})`);
}

module.exports = { runExchangeAutoSync, startExchangeAutoSync };
