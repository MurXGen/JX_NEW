/* Lifecycle / onboarding emails (welcome + day 1/3/7 nudges).
   Sent via Resend, reusing the existing client. Each email is branded,
   has a single clear CTA button, and a one-click unsubscribe link.

   Env used:
     RESEND_API_KEY  — Resend auth (already set for OTP)
     EMAIL_FROM      — sender address (already set for OTP)
     CLIENT_URL      — frontend base for CTA + unsubscribe links
                       (falls back to https://journalx.app)
     JWT_SECRET      — signs the unsubscribe token
*/
const crypto = require("crypto");
const { resend } = require("./resendClient");
const L = require("./layout");
const { layout, plainText, esc } = L;

/* Pick a PUBLIC url for email links. CLIENT_URL is often http://localhost:3000
   for local CORS, which must never end up in a real email — so we ignore any
   localhost value and fall back to the production domain. An explicit
   APP_PUBLIC_URL / API_PUBLIC_URL always wins. */
const isLocal = (u) => !u || /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(u);
const pickPublic = (candidates, fallback) => {
  for (const c of candidates) {
    if (c && !isLocal(c)) return c.replace(/\/+$/, "");
  }
  return fallback;
};

const APP_URL = pickPublic([process.env.APP_PUBLIC_URL, process.env.CLIENT_URL], "https://journalx.app");
const API_URL = pickPublic([process.env.API_PUBLIC_URL, process.env.API_URL], "https://api.journalx.app");
const FROM = `JournalX <${process.env.EMAIL_FROM}>`;

/* Should lifecycle emails actually go out?  We DON'T trust NODE_ENV alone here
   because local .env files often set NODE_ENV=production with a live Resend key
   — running locally would then email real users. Rules:
     ONBOARDING_LIVE=true   → always send (explicit on)
     ONBOARDING_LIVE=false  → never send (explicit off)
     otherwise              → send only when we detect a real hosted env
                              (Railway sets RAILWAY_* automatically); local = off
   This is the single switch both the scheduler and the inline welcome use. */
function isLiveEnv() {
  const flag = String(process.env.ONBOARDING_LIVE || "").toLowerCase();
  if (flag === "true") return true;
  if (flag === "false") return false;
  return !!(
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.RAILWAY_PROJECT_ID ||
    process.env.RAILWAY_SERVICE_ID
  );
}

/* ---- unsubscribe token (HMAC of userId, no DB lookup needed to verify) ---- */
function unsubToken(userId) {
  return crypto
    .createHmac("sha256", process.env.JWT_SECRET || "jx-fallback-secret")
    .update(`unsub:${userId}`)
    .digest("hex")
    .slice(0, 32);
}
function verifyUnsubToken(userId, token) {
  if (!userId || !token) return false;
  const expected = unsubToken(userId);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(token)));
  } catch {
    return false;
  }
}
function unsubscribeUrl(userId) {
  return `${API_URL}/api/auth/email/unsubscribe?u=${userId}&t=${unsubToken(userId)}`;
}

/* ---- shared layout (see ./layout.js) ---- */
function shell({ heading, intro, bodyText, ctaText, ctaUrl, footnote, unsubUrl }) {
  return layout({
    preheader: intro || heading,
    heading: esc(heading),
    body: [intro && L.p(intro), bodyText && L.p(bodyText)].filter(Boolean).join(""),
    cta: ctaText && ctaUrl ? { text: ctaText, url: ctaUrl } : null,
    footer: [
      footnote ? `${footnote}<br/>` : "",
      "You're receiving this because you created a JournalX account.",
      unsubUrl ? ` <a href="${unsubUrl}" target="_blank" style="color:#6b7280;text-decoration:underline;">Unsubscribe from onboarding emails</a>` : "",
    ].join(""),
  });
}

const plain = (m, unsubUrl) =>
  plainText([m.heading, m.intro, m.bodyText, m.ctaUrl && `${m.ctaText}: ${m.ctaUrl}`, m.footnote, unsubUrl && `Unsubscribe: ${unsubUrl}`]);

/* ---- the four messages ---- */
function buildEmail(stage, user) {
  const name = (user.name || "").trim().split(" ")[0] || "there";
  const unsubUrl = unsubscribeUrl(user._id);
  const dash = `${APP_URL}/dashboard`;

  const M = {
    welcome: {
      subject: "Welcome to JournalX. Log your first trade",
      heading: `Welcome to JournalX, ${name}`,
      intro: "Your account is ready. Every trade you log turns into clear analytics: win rate, R-multiple, equity curve and the habits behind your decisions.",
      bodyText: "Logging a trade takes about 10 seconds. Add one now and your first insights appear straight away.",
      ctaText: "Open your dashboard",
      ctaUrl: dash,
      footnote: "You can log a trade by hand, import a CSV, or sync a supported exchange.",
    },
    day1: {
      subject: "Log your first trade in 10 seconds",
      heading: "One trade is all it takes",
      intro: `Hi ${name}, you joined yesterday but haven't logged a trade yet. As soon as you do, JournalX starts building your win rate, R-multiple and equity curve.`,
      bodyText: "No spreadsheet and no setup. Log what you traded and JournalX does the math.",
      ctaText: "Log your first trade",
      ctaUrl: dash,
    },
    day3: {
      subject: "A quick tip to get more from JournalX",
      heading: "Turn discipline into data",
      intro: `Hi ${name}, traders who improve fastest are the ones who journal consistently. Even a few trades show patterns you can't see in the moment: your best setups, your costly habits, and when to size up or step back.`,
      bodyText: "Your dashboard already has win and loss breakdowns, a P&amp;L calendar and more, waiting for your trades.",
      ctaText: "Explore your dashboard",
      ctaUrl: dash,
    },
    day7: {
      subject: "Here's what JournalX can do for you",
      heading: "Your edge is in your trades",
      intro: `Hi ${name}, this is our last reminder for now. JournalX makes your edge measurable, so you stop guessing and improve with every trade you log.`,
      bodyText: "Whenever you're ready, your dashboard is one click away. Reply to this email with any question and a real person will answer.",
      ctaText: "Start journaling",
      ctaUrl: dash,
      footnote: "We won't send more reminders after this one.",
    },
  };

  const m = M[stage];
  if (!m) throw new Error(`Unknown lifecycle stage: ${stage}`);

  const html = shell({ ...m, unsubUrl });
  const text = plain({ ...m, bodyText: m.bodyText.replace(/&amp;/g, "&") }, unsubUrl);
  return { subject: m.subject, html, text };
}

/* send one lifecycle email; resolves false on any failure (never throws) */
async function sendLifecycleEmail(stage, user) {
  try {
    if (!user?.email) return false;
    if (!isLiveEnv()) {
      console.log(`[lifecycle] SKIPPED (non-live env) — would send "${stage}" to ${user.email}. Set ONBOARDING_LIVE=true to enable.`);
      return false;
    }
    const { subject, html, text } = buildEmail(stage, user);
    await resend.emails.send({ from: FROM, to: user.email, subject, html, text });
    return true;
  } catch (err) {
    console.error(`[lifecycle] failed to send "${stage}" to ${user?.email}:`, err?.message || err);
    return false;
  }
}

module.exports = { buildEmail, sendLifecycleEmail, verifyUnsubToken, unsubToken, unsubscribeUrl, isLiveEnv };
