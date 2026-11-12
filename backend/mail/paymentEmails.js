/* Payment confirmation email (Paddle card / PayPal payments).
   Same look as the lifecycle emails: JournalX wordmark with a gold X, one
   white card, a gold CTA. Carries the price breakdown, including the coupon
   the buyer used, and the list of what Pro unlocks.

   Sent once per Paddle transaction (called only when the order record is
   first created, which is idempotent on the transaction id).

   Env: RESEND_API_KEY, EMAIL_FROM, APP_PUBLIC_URL / CLIENT_URL.
   Live-send switch: PAYMENT_EMAILS_LIVE=true|false; otherwise sends only on
   the hosted (Railway) server, so local runs never email real customers. */
const { resend } = require("./resendClient");

const isLocal = (u) => !u || /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(u);
const APP_URL = [process.env.APP_PUBLIC_URL, process.env.CLIENT_URL].find((u) => u && !isLocal(u))?.replace(/\/+$/, "") || "https://journalx.app";
const FROM = `JournalX <${process.env.EMAIL_FROM}>`;
const C = { gold: "#f0b90b", goldSoft: "#fcd535", ink: "#12161c", body: "#3b424d", muted: "#707a8a", bg: "#f2f3f5", card: "#ffffff", border: "#e6e8eb", green: "#12895c", greenBg: "#eafaf2" };
const FONT = "'Poppins',Arial,sans-serif";

function isLive() {
  const flag = String(process.env.PAYMENT_EMAILS_LIVE || "").toLowerCase();
  if (flag === "true") return true;
  if (flag === "false") return false;
  return !!(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID || process.env.RAILWAY_SERVICE_ID);
}

const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Paddle API totals are strings in the currency's smallest unit.
const ZERO_DECIMAL = new Set(["JPY", "KRW", "VND", "CLP", "ISK", "HUF", "TWD", "UGX", "XAF", "XOF"]);
function fromMinor(v, cur) {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return ZERO_DECIMAL.has(cur) ? n : n / 100;
}
function money(n, cur) {
  if (n == null) return "—";
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency: cur || "USD" }).format(n); }
  catch { return `${cur} ${n.toFixed(2)}`; }
}
const fmtDate = (d) => {
  const x = d ? new Date(d) : null;
  return x && !Number.isNaN(x.getTime()) ? x.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : null;
};

const UNLOCKED = [
  ["Unlimited trades", "Log every trade and chart, no monthly cap"],
  ["Full history", "Every past trade and stat, nothing locked"],
  ["Advanced analytics", "Risk, edge and behaviour insights"],
  ["Exchange auto-sync &amp; 3 journals", "Connect exchanges and split your accounts"],
];

/* Build the receipt numbers from a Paddle transaction. */
function receiptFrom(txn, cls, discountCode) {
  const cur = txn?.currency_code || "USD";
  const t = txn?.details?.totals || {};
  const lifetime = cls?.plan === "lifetime";
  const yearly = cls?.period === "yearly";
  return {
    currency: cur,
    planLabel: lifetime ? "JournalX Lifetime" : `JournalX Pro · ${yearly ? "Yearly" : "Monthly"}`,
    lifetime,
    subtotal: fromMinor(t.subtotal, cur),
    discount: fromMinor(t.discount, cur) || 0,
    tax: fromMinor(t.tax, cur) || 0,
    total: fromMinor(t.grand_total ?? t.total, cur),
    code: discountCode || null,
    paidAt: fmtDate(txn?.billed_at || txn?.updated_at || txn?.created_at || Date.now()),
    nextAt: lifetime ? null : fmtDate(txn?.billing_period?.ends_at),
    period: yearly ? "year" : "month",
    txnId: txn?.id || "",
    invoice: txn?.invoice_number || null,
    renewal: txn?.origin === "subscription_recurring",
  };
}

function row(label, value, { tone, strong } = {}) {
  const color = tone === "save" ? C.green : C.ink;
  const size = strong ? "16px" : "14px";
  const weight = strong ? "700" : "500";
  const top = strong ? `border-top:1px solid ${C.border};padding-top:12px;` : "";
  return `<tr>
    <td style="padding:6px 0;${top}font-family:${FONT};font-size:${strong ? "14px" : "13.5px"};color:${strong ? C.ink : C.muted};font-weight:${strong ? "600" : "400"};">${label}</td>
    <td align="right" style="padding:6px 0;${top}font-family:${FONT};font-size:${size};font-weight:${weight};color:${color};white-space:nowrap;">${value}</td>
  </tr>`;
}

function buildPaymentEmail(user, r) {
  const name = esc((user?.name || "").trim().split(" ")[0] || "there");
  const dash = `${APP_URL}/dashboard`;
  const billing = `${APP_URL}/dashboard?view=settings&settings=billing`;

  const subject = r.renewal
    ? `Payment received: your JournalX Pro plan has renewed`
    : r.lifetime
      ? `You're on JournalX Lifetime 🎉 Payment confirmed`
      : `Welcome to JournalX Pro 🎉 Payment confirmed`;
  const heading = r.renewal ? `Thanks, ${name}. Your plan has renewed` : r.lifetime ? `Lifetime unlocked, ${name}!` : `Welcome to Pro, ${name}!`;
  const intro = r.renewal
    ? "We've received your payment and your Pro access continues without a break."
    : "Your payment went through and everything in JournalX is now unlocked. Here's your receipt.";

  const codeChip = r.code
    ? ` <span style="display:inline-block;margin-left:6px;padding:1px 7px;border:1px dashed ${C.green};border-radius:6px;background:${C.greenBg};color:${C.green};font-size:11px;font-weight:700;letter-spacing:.04em;">${esc(r.code)}</span>`
    : "";
  const rows = [
    row("Plan", esc(r.planLabel)),
    r.subtotal != null ? row("Subtotal", money(r.subtotal, r.currency)) : "",
    r.discount > 0 ? row(`Discount${codeChip}`, `&minus;${money(r.discount, r.currency)}`, { tone: "save" }) : "",
    r.tax > 0 ? row("Tax", money(r.tax, r.currency)) : "",
    row("Total paid", money(r.total, r.currency), { strong: true }),
  ].join("");

  const meta = [
    r.paidAt && `Paid on ${esc(r.paidAt)}`,
    r.invoice ? `Invoice ${esc(r.invoice)}` : r.txnId && `Ref ${esc(r.txnId)}`,
  ].filter(Boolean).join(" &nbsp;·&nbsp; ");
  const billingLine = r.lifetime
    ? "One-time payment. Pro is yours for good, with no renewals."
    : `Renews every ${r.period}${r.nextAt ? ` · next charge on <strong style="color:${C.ink};">${esc(r.nextAt)}</strong>` : ""}. Cancel anytime from <a href="${billing}" style="color:${C.body};">Settings → Plan &amp; billing</a>.`;

  const savedNote = r.discount > 0
    ? `<tr><td style="padding:0 0 18px;"><div style="padding:10px 14px;border-radius:10px;background:${C.greenBg};font-family:${FONT};font-size:13px;color:${C.green};font-weight:600;">You saved ${money(r.discount, r.currency)}${r.code ? ` with ${esc(r.code)}` : ""} 🎉</div></td></tr>`
    : "";

  const unlocked = r.renewal ? "" : `
    <tr><td style="padding:22px 0 8px;font-family:${FONT};font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${C.muted};font-weight:600;">Now unlocked</td></tr>
    <tr><td>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${UNLOCKED.map(([t, d]) => `<tr>
          <td width="30" valign="top" style="padding:7px 0;"><div style="width:22px;height:22px;border-radius:7px;background:#fff7d6;color:#9a7400;font-family:Arial,sans-serif;font-size:13px;font-weight:700;line-height:22px;text-align:center;">&#10003;</div></td>
          <td style="padding:7px 0;font-family:${FONT};"><div style="font-size:14px;font-weight:600;color:${C.ink};">${t}</div><div style="font-size:12.5px;color:${C.muted};line-height:1.5;">${d}</div></td>
        </tr>`).join("")}
      </table>
    </td></tr>`;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="light"/><title>JournalX receipt</title></head>
<body style="margin:0;padding:0;background:${C.bg};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(intro)} Total paid ${money(r.total, r.currency)}.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
        <tr><td style="padding:6px 4px 18px;font-family:${FONT};font-size:22px;font-weight:700;color:${C.ink};">Journal<span style="color:${C.gold};">X</span></td></tr>
        <tr><td style="background:${C.card};border:1px solid ${C.border};border-radius:16px;overflow:hidden;">
          <!-- gold header band -->
          <div style="height:4px;background:linear-gradient(90deg,${C.goldSoft},${C.gold});background-color:${C.gold};"></div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:28px 28px 30px;">
            <tr><td style="padding-bottom:14px;">
              <span style="display:inline-block;padding:4px 10px;border-radius:999px;background:${C.greenBg};color:${C.green};font-family:${FONT};font-size:12px;font-weight:600;">&#10003; Payment confirmed</span>
            </td></tr>
            <tr><td style="font-family:${FONT};font-size:22px;line-height:1.3;font-weight:700;color:${C.ink};padding-bottom:10px;">${heading}</td></tr>
            <tr><td style="font-family:${FONT};font-size:15px;line-height:1.65;color:${C.body};padding-bottom:20px;">${intro}</td></tr>
            ${savedNote}
            <tr><td style="border:1px solid ${C.border};border-radius:12px;padding:14px 16px;background:#fafbfc;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
              ${meta ? `<div style="padding-top:10px;font-family:${FONT};font-size:12px;color:${C.muted};">${meta}</div>` : ""}
            </td></tr>
            <tr><td style="padding-top:12px;font-family:${FONT};font-size:12.5px;line-height:1.6;color:${C.muted};">${billingLine}</td></tr>
            ${unlocked}
            <tr><td style="padding-top:22px;">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:12px;background:${C.gold};">
                <a href="${dash}" target="_blank" style="display:inline-block;padding:13px 26px;font-family:${FONT};font-size:15px;font-weight:600;color:#1e2329;text-decoration:none;border-radius:12px;">Open your dashboard &nbsp;&rarr;</a>
              </td></tr></table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:18px 6px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.muted};">
          Payments are processed by Paddle, our payment partner, who also emails the official tax invoice. Questions about this charge? Just reply to this email.<br/>
          <a href="${APP_URL}" target="_blank" style="color:${C.muted};text-decoration:underline;">journalx.app</a><br/>
          <span style="color:#9aa1ab;">— The JournalX Team</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    heading.replace(/&amp;/g, "&"),
    intro,
    `Plan: ${r.planLabel}`,
    r.subtotal != null ? `Subtotal: ${money(r.subtotal, r.currency)}` : null,
    r.discount > 0 ? `Discount${r.code ? ` (${r.code})` : ""}: -${money(r.discount, r.currency)}` : null,
    r.tax > 0 ? `Tax: ${money(r.tax, r.currency)}` : null,
    `Total paid: ${money(r.total, r.currency)}`,
    r.lifetime ? "One-time payment." : `Renews every ${r.period}${r.nextAt ? `, next charge on ${r.nextAt}` : ""}. Cancel anytime in Settings > Plan & billing.`,
    `Open your dashboard: ${dash}`,
    "Payments are processed by Paddle, who also emails the official tax invoice.",
    "— The JournalX Team",
  ].filter(Boolean).join("\n\n");

  return { subject, html, text };
}

/* Send the confirmation. Never throws; resolves true when sent. */
async function sendPaymentSuccessEmail(user, cls, txn, { discountCode } = {}) {
  try {
    if (!user?.email) return false;
    const r = receiptFrom(txn, cls, discountCode);
    if (!isLive()) {
      console.log(`[payment-email] SKIPPED (non-live env) — would send receipt ${r.txnId} to ${user.email}. Set PAYMENT_EMAILS_LIVE=true to enable.`);
      return false;
    }
    const { subject, html, text } = buildPaymentEmail(user, r);
    await resend.emails.send({ from: FROM, to: user.email, subject, html, text });
    console.log(`[payment-email] sent receipt ${r.txnId} to ${user.email}`);
    return true;
  } catch (err) {
    console.error(`[payment-email] failed for ${user?.email}:`, err?.message || err);
    return false;
  }
}

module.exports = { sendPaymentSuccessEmail, buildPaymentEmail, receiptFrom };
