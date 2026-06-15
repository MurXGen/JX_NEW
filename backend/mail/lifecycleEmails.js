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
const BRAND = { gold: "#f0b90b", goldSoft: "#fcd535", ink: "#12161c", muted: "#707a8a", bg: "#f2f3f5", card: "#ffffff", border: "#e6e8eb" };

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

/* ---- shared HTML shell: header wordmark, body, gold CTA, footer ---- */
function shell({ heading, intro, bodyHtml = "", ctaText, ctaUrl, footnote, unsubUrl }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="light"/>
<title>JournalX</title></head>
<body style="margin:0;padding:0;background:${BRAND.bg};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${intro || heading}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
        <!-- brand -->
        <tr><td style="padding:6px 4px 18px;font-family:'Poppins',Arial,sans-serif;font-size:22px;font-weight:700;color:${BRAND.ink};">
          Journal<span style="color:${BRAND.gold};">X</span>
        </td></tr>
        <!-- card -->
        <tr><td style="background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:16px;padding:30px 28px;">
          <h1 style="margin:0 0 12px;font-family:'Poppins',Arial,sans-serif;font-size:22px;line-height:1.3;color:${BRAND.ink};">${heading}</h1>
          ${intro ? `<p style="margin:0 0 16px;font-family:'Poppins',Arial,sans-serif;font-size:15px;line-height:1.65;color:#3b424d;">${intro}</p>` : ""}
          ${bodyHtml}
          ${ctaText && ctaUrl ? `
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 6px;">
            <tr><td style="border-radius:12px;background:${BRAND.gold};">
              <a href="${ctaUrl}" target="_blank"
                 style="display:inline-block;padding:13px 26px;font-family:'Poppins',Arial,sans-serif;font-size:15px;font-weight:600;color:#1e2329;text-decoration:none;border-radius:12px;">
                ${ctaText} &nbsp;&rarr;
              </a>
            </td></tr>
          </table>` : ""}
          ${footnote ? `<p style="margin:18px 0 0;font-family:'Poppins',Arial,sans-serif;font-size:13px;line-height:1.6;color:${BRAND.muted};">${footnote}</p>` : ""}
        </td></tr>
        <!-- footer -->
        <tr><td style="padding:18px 6px 0;font-family:'Poppins',Arial,sans-serif;font-size:12px;line-height:1.6;color:${BRAND.muted};">
          You're receiving this because you created a JournalX account.<br/>
          ${unsubUrl ? `<a href="${unsubUrl}" target="_blank" style="color:${BRAND.muted};text-decoration:underline;">Unsubscribe from onboarding emails</a> &nbsp;·&nbsp; ` : ""}
          <a href="${APP_URL}" target="_blank" style="color:${BRAND.muted};text-decoration:underline;">journalx.app</a><br/>
          <span style="color:#9aa1ab;">— The JournalX Team</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

const plain = (lines, ctaUrl, unsubUrl) =>
  `${lines.join("\n\n")}${ctaUrl ? `\n\n${ctaUrl}` : ""}\n\n— The JournalX Team${unsubUrl ? `\n\nUnsubscribe: ${unsubUrl}` : ""}`;

/* ---- the four messages ---- */
function buildEmail(stage, user) {
  const name = (user.name || "").trim().split(" ")[0] || "there";
  const unsubUrl = unsubscribeUrl(user._id);
  const dash = `${APP_URL}/dashboard`;

  const M = {
    welcome: {
      subject: "Welcome to JournalX 🎉 Let's log your first trade",
      heading: `Welcome aboard, ${name}!`,
      intro: "Your account is ready. JournalX turns every trade you log into clear, automatic analytics — win rate, R-multiple, equity curve and the psychology behind your decisions.",
      bodyHtml: `<p style="margin:0;font-family:'Poppins',Arial,sans-serif;font-size:15px;line-height:1.65;color:#3b424d;">It takes about <strong>10 seconds</strong> to log a trade. Do one now and your first insights appear instantly.</p>`,
      ctaText: "Open your dashboard",
      ctaUrl: dash,
      footnote: "New here? You can quick-log a trade, import a CSV, or auto-sync a supported exchange.",
    },
    day1: {
      subject: "Your JournalX is ready — log your first trade in 10 seconds",
      heading: "One trade is all it takes",
      intro: `Hi ${name}, you joined yesterday but haven't logged a trade yet. The moment you do, JournalX starts building your win-rate, R-multiple and equity-curve analytics automatically.`,
      bodyHtml: `<p style="margin:0;font-family:'Poppins',Arial,sans-serif;font-size:15px;line-height:1.65;color:#3b424d;">No spreadsheet, no setup — just log what you traded and we handle the math.</p>`,
      ctaText: "Log your first trade",
      ctaUrl: dash,
    },
    day3: {
      subject: "A quick tip to get the most out of JournalX",
      heading: "Turn discipline into data",
      intro: `Hi ${name}, the traders who improve fastest are the ones who journal consistently. Even logging a few trades reveals patterns you can't see in the moment — your best setups, your worst habits, and when to size up or step back.`,
      bodyHtml: `<p style="margin:0;font-family:'Poppins',Arial,sans-serif;font-size:15px;line-height:1.65;color:#3b424d;">Open the dashboard to see the analytics waiting for your data — win/loss breakdowns, P&amp;L calendar and more.</p>`,
      ctaText: "Explore your dashboard",
      ctaUrl: dash,
    },
    day7: {
      subject: "Still thinking it over? Here's what JournalX can do",
      heading: "Your edge is hiding in your trades",
      intro: `Hi ${name}, this is the last nudge from us for now. JournalX exists to make your edge measurable — so you stop guessing and start improving with every trade you log.`,
      bodyHtml: `<p style="margin:0;font-family:'Poppins',Arial,sans-serif;font-size:15px;line-height:1.65;color:#3b424d;">Whenever you're ready, your dashboard is one click away. Reply to this email if you have any questions — a real person reads it.</p>`,
      ctaText: "Start journaling",
      ctaUrl: dash,
      footnote: "We won't keep nudging you after this. You can always unsubscribe below.",
    },
  };

  const m = M[stage];
  if (!m) throw new Error(`Unknown lifecycle stage: ${stage}`);

  const html = shell({ ...m, unsubUrl });
  const text = plain(
    [m.heading, m.intro, m.bodyHtml.replace(/<[^>]+>/g, "")],
    m.ctaUrl,
    unsubUrl,
  );
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

module.exports = { sendLifecycleEmail, verifyUnsubToken, unsubToken, unsubscribeUrl, isLiveEnv };
