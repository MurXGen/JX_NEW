/* Onboarding reminder drip (Option A — in-process scheduler).

   Runs periodically and sends, at most once each, a small sequence of
   onboarding emails to NEW users:

     welcome  → as soon as the account is verified
     day1     → ~24h after verifying, IF they still haven't logged a trade
     day3     → ~3 days after, IF still no trade
     day7     → ~7 days after, IF still no trade (final nudge)

   Each send is stamped on user.lifecycle.<stage>At so it never repeats.
   Users who opted out (emailOptOut) or who have logged a trade are skipped
   for the conditional stages. The welcome email always goes out once.

   No external scheduler/dependency: a guarded setInterval drives it. This
   assumes a single always-on backend instance (Railway). If you ever run
   multiple instances, gate startOnboardingScheduler() to one worker.

   Toggle / tune with env:
     ONBOARDING_EMAILS_ENABLED = "false" to disable (default enabled)
     ONBOARDING_INTERVAL_MIN   = minutes between runs (default 30)
*/
const User = require("../models/User");
const Trade = require("../models/Trade");
const { sendLifecycleEmail, isLiveEnv } = require("../mail/lifecycleEmails");

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const BATCH = 100; // max users per stage per run

let running = false;

const hasLoggedTrade = async (userId) => !!(await Trade.exists({ userId }));

/* anchor time = when the user became active (verified), fallback to signup */
const anchor = (u) => new Date(u.verifiedAt || u.createdAt || Date.now()).getTime();

async function processStage({ stage, field, minAgeMs, requireNoTrade }) {
  const now = Date.now();

  // base filter: verified, not opted out, this stage not yet sent
  const query = {
    isVerified: true,
    emailOptOut: { $ne: true },
    [`lifecycle.${field}`]: { $exists: false },
  };

  const users = await User.find(query)
    .select("name email verifiedAt createdAt lifecycle")
    .limit(BATCH)
    .lean();

  let sent = 0;
  for (const u of users) {
    // time gate (welcome has minAgeMs = 0)
    if (minAgeMs > 0 && now - anchor(u) < minAgeMs) continue;
    // conditional stages: skip anyone who already logged a trade
    if (requireNoTrade && (await hasLoggedTrade(u._id))) continue;

    // claim the stage BEFORE sending so an overlapping run can't double-send
    const claim = await User.updateOne(
      { _id: u._id, [`lifecycle.${field}`]: { $exists: false } },
      { $set: { [`lifecycle.${field}`]: new Date() } },
    );
    if (!claim.modifiedCount) continue; // someone else claimed it

    const ok = await sendLifecycleEmail(stage, u);
    if (!ok) {
      // sending failed — release the claim so we retry next run
      await User.updateOne({ _id: u._id }, { $unset: { [`lifecycle.${field}`]: "" } });
      continue;
    }
    sent += 1;
  }
  return sent;
}

async function runOnboardingReminders() {
  if (running) return;
  running = true;
  try {
    const results = {};
    results.welcome = await processStage({ stage: "welcome", field: "welcomeAt", minAgeMs: 0, requireNoTrade: false });
    results.day1 = await processStage({ stage: "day1", field: "day1At", minAgeMs: 1 * DAY, requireNoTrade: true });
    results.day3 = await processStage({ stage: "day3", field: "day3At", minAgeMs: 3 * DAY, requireNoTrade: true });
    results.day7 = await processStage({ stage: "day7", field: "day7At", minAgeMs: 7 * DAY, requireNoTrade: true });

    const total = Object.values(results).reduce((a, b) => a + b, 0);
    if (total > 0) console.log(`[onboarding] sent ${total} email(s):`, results);
    return results;
  } catch (err) {
    console.error("[onboarding] run error:", err?.message || err);
  } finally {
    running = false;
  }
}

function startOnboardingScheduler() {
  if (String(process.env.ONBOARDING_EMAILS_ENABLED).toLowerCase() === "false") {
    console.log("[onboarding] disabled via ONBOARDING_EMAILS_ENABLED=false");
    return;
  }
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    console.warn("[onboarding] RESEND_API_KEY / EMAIL_FROM not set — scheduler not started");
    return;
  }
  if (!isLiveEnv()) {
    console.log("[onboarding] non-live env (local) — scheduler not started. Set ONBOARDING_LIVE=true to enable.");
    return;
  }
  const minutes = Math.max(5, parseInt(process.env.ONBOARDING_INTERVAL_MIN || "30", 10) || 30);
  // first pass shortly after boot, then on the interval
  setTimeout(runOnboardingReminders, 60 * 1000);
  setInterval(runOnboardingReminders, minutes * 60 * 1000);
  console.log(`[onboarding] scheduler started — every ${minutes} min`);
}

module.exports = { runOnboardingReminders, startOnboardingScheduler };
