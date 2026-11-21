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
const { APP_URL, FONT, C, esc, p, divider, label, layout, plainText } = require("./layout");

const FROM = `JournalX <${process.env.EMAIL_FROM}>`;

function isLive() {
  const flag = String(process.env.PAYMENT_EMAILS_LIVE || "").toLowerCase();
  if (flag === "true") return true;
  if (flag === "false") return false;
  return !!(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID || process.env.RAILWAY_SERVICE_ID);
}


// Paddle API totals are strings in the currency's smallest unit.
const ZERO_DECIMAL = new Set(["JPY", "KRW", "VND", "CLP", "ISK", "HUF", "TWD", "UGX", "XAF", "XOF"]);
function fromMinor(v, cur) {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return ZERO_DECIMAL.has(cur) ? n : n / 100;
}
function money(n, cur) {
  if (n == null) return "-";
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
  const top = strong ? `border-top:1px solid ${C.line};` : "";
  const pad = strong ? "12px 0 0" : "6px 0";
  return `<tr>
    <td style="padding:${pad};${top}font-family:${FONT};font-size:14px;color:${strong ? C.ink : C.muted};font-weight:${strong ? 600 : 400};">${label}</td>
    <td align="right" style="padding:${pad};${top}font-family:${FONT};font-size:${strong ? "16px" : "14px"};font-weight:${strong ? 700 : 500};color:${tone === "save" ? C.green : C.ink};white-space:nowrap;">${value}</td>
  </tr>`;
}

function buildPaymentEmail(user, r) {
  const name = esc((user?.name || "").trim().split(" ")[0] || "there");
  const dash = `${APP_URL}/dashboard`;
  const billing = `${APP_URL}/dashboard?view=settings&settings=billing`;

  const subject = r.renewal
    ? "Payment received: your JournalX Pro plan has renewed"
    : r.lifetime
      ? "Payment confirmed: welcome to JournalX Lifetime"
      : "Payment confirmed: welcome to JournalX Pro";
  const heading = r.renewal ? `Thanks, ${name}. Your plan has renewed` : r.lifetime ? `Lifetime unlocked, ${name}` : `Welcome to Pro, ${name}`;
  const intro = r.renewal
    ? "We've received your payment and your Pro access continues without a break."
    : "Your payment went through and everything in JournalX is now unlocked. Here's your receipt.";

  const codeTag = r.code
    ? ` <span style="display:inline-block;margin-left:6px;padding:1px 7px;border:1px solid ${C.line};border-radius:6px;color:${C.ink};font-size:11px;font-weight:600;letter-spacing:.04em;">${esc(r.code)}</span>`
    : "";
  const rows = [
    row("Plan", esc(r.planLabel)),
    r.subtotal != null ? row("Subtotal", money(r.subtotal, r.currency)) : "",
    r.discount > 0 ? row(`Discount${codeTag}`, `&minus;${money(r.discount, r.currency)}`, { tone: "save" }) : "",
    r.tax > 0 ? row("Tax", money(r.tax, r.currency)) : "",
    row("Total paid", money(r.total, r.currency), { strong: true }),
  ].join("");

  const meta = [
    r.paidAt && `Paid on ${esc(r.paidAt)}`,
    r.invoice ? `Invoice ${esc(r.invoice)}` : r.txnId && `Ref ${esc(r.txnId)}`,
  ].filter(Boolean).join(" &nbsp;&middot;&nbsp; ");
  const billingLine = r.lifetime
    ? "One-time payment. Pro is yours for good, with no renewals."
    : `Renews every ${r.period}${r.nextAt ? `, next charge on <strong style="color:${C.ink};">${esc(r.nextAt)}</strong>` : ""}. Cancel anytime in <a href="${billing}" style="color:${C.body};">Settings &rarr; Plan &amp; billing</a>.`;

  const unlocked = r.renewal ? "" : `
    ${divider(22)}
    ${label("Now unlocked")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${UNLOCKED.map(([t, d]) => `<tr><td style="padding:7px 0;border-bottom:1px solid ${C.line};font-family:${FONT};">
        <div style="font-size:14px;font-weight:600;color:${C.ink};">${t}</div>
        <div style="font-size:13px;color:${C.muted};line-height:1.5;">${d}</div>
      </td></tr>`).join("")}
    </table>
    <div style="height:14px;line-height:14px;font-size:0;">&nbsp;</div>`;

  const body = `
    ${p(intro)}
    ${r.discount > 0 ? p(`You saved <strong style="color:${C.green};">${money(r.discount, r.currency)}</strong>${r.code ? ` with ${esc(r.code)}` : ""}.`, { size: 14 }) : ""}
    ${label("Receipt")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.line};padding-top:6px;">${rows}</table>
    ${meta ? `<div style="padding-top:10px;font-family:${FONT};font-size:12px;color:${C.faint};">${meta}</div>` : ""}
    ${p(billingLine, { muted: true, size: 13, top: 12, bottom: 0 })}
    ${unlocked || '<div style="height:18px;line-height:18px;font-size:0;">&nbsp;</div>'}`;

  const html = layout({
    title: "JournalX receipt",
    preheader: `${intro} Total paid ${money(r.total, r.currency)}.`,
    heading,
    body,
    cta: { text: "Open your dashboard", url: dash },
    footer: "Payments are processed by Paddle, who also emails the official tax invoice. Questions about this charge? Reply to this email.",
  });

  const text = plainText([
    heading,
    intro,
    `Plan: ${r.planLabel}`,
    r.subtotal != null ? `Subtotal: ${money(r.subtotal, r.currency)}` : null,
    r.discount > 0 ? `Discount${r.code ? ` (${r.code})` : ""}: -${money(r.discount, r.currency)}` : null,
    r.tax > 0 ? `Tax: ${money(r.tax, r.currency)}` : null,
    `Total paid: ${money(r.total, r.currency)}`,
    r.lifetime ? "One-time payment." : `Renews every ${r.period}${r.nextAt ? `, next charge on ${r.nextAt}` : ""}. Cancel anytime in Settings > Plan & billing.`,
    `Open your dashboard: ${dash}`,
    "Payments are processed by Paddle, who also emails the official tax invoice.",
  ]);

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
