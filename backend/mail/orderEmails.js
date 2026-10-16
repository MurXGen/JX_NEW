// TheBookX order emails (order confirmation + status updates) via Resend.
// Sent from the TheBookX verified domain (BOOKX_EMAIL_FROM), with replies
// routed to the store's Gmail (BOOKX_EMAIL_REPLY_TO). The email body carries
// the full order + bill breakdown as HTML, and the PNG invoice is attached
// when the client supplies it (invoiceBase64).

const { resend } = require("./resendClient");

const FROM =
  process.env.BOOKX_EMAIL_FROM ||
  `TheBookX <${process.env.EMAIL_FROM || "no-reply@mail.thebookx.in"}>`;
const REPLY_TO = process.env.BOOKX_EMAIL_REPLY_TO || "uskillbook@gmail.com";
// Monochrome, editorial palette.
const INK = "#111111";
const SITE_URL = "https://www.thebookx.in";
const REVIEW_URL = "https://www.thebookx.in/review";
// Use the existing black-and-white favicon (served at /favicon.ico) so the
// email logo matches the monochrome design — no new asset created.
const LOGO_URL = "https://www.thebookx.in/favicon.ico";

const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
const rs = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

// One bill line (label + amount). `tone`: "muted" | "save" | "total".
function billRow(label, amount, tone) {
  const labelColor = tone === "muted" ? "#8a8a8a" : "#3a3a3a";
  const amtColor = tone === "total" ? INK : tone === "muted" ? "#8a8a8a" : INK;
  const weight = tone === "total" ? "800" : "500";
  const size = tone === "total" ? "15px" : "13.5px";
  const border = tone === "total" ? "border-top:1px solid #eaeaea;" : "";
  return `<tr>
    <td style="padding:6px 0;${border}color:${labelColor};font-size:${size};">${esc(label)}</td>
    <td style="padding:6px 0;${border}text-align:right;color:${amtColor};font-weight:${weight};font-size:${size};">${esc(amount)}</td>
  </tr>`;
}

// Five black stars, each linking to the review page.
function starRow() {
  const star = `<a href="${REVIEW_URL}" style="text-decoration:none;color:${INK};font-size:28px;line-height:1;margin:0 3px;">&#9733;</a>`;
  return `<div style="text-align:center;margin-top:4px;">
    <div style="font-size:13px;color:#555;margin-bottom:10px;">How was your experience?</div>
    <div style="line-height:1;">${star.repeat(5)}</div>
    <div style="font-size:11.5px;color:#999;margin-top:8px;">Tap a star to leave a quick review</div>
  </div>`;
}

// "Refer a friend" block.
function referBlock() {
  return `<div style="border:1px solid #e6e6e6;border-radius:14px;padding:18px;text-align:center;background:#fbfbfb;">
    <div style="font-weight:800;color:${INK};font-size:14.5px;">Enjoyed TheBookX?</div>
    <div style="font-size:12.5px;color:#666;margin:5px 0 12px;line-height:1.5;">Share us with a fellow reader — word of mouth is how a small bookstore grows.</div>
    <a href="${SITE_URL}" style="display:inline-block;border:1px solid ${INK};color:${INK};text-decoration:none;font-weight:700;font-size:13px;padding:10px 20px;border-radius:999px;">Refer a friend &rarr;</a>
  </div>`;
}

// Build the shared HTML bill table from a normalised bill object.
function billTable(order) {
  const b = order.bill || {};
  const rows = [];
  if (b.mrp) rows.push(billRow("Total MRP", rs(b.mrp)));
  if (b.itemDiscount > 0)
    rows.push(billRow("Item discount", `− ${rs(b.itemDiscount)}`, "save"));
  if (b.subtotal) rows.push(billRow("Subtotal", rs(b.subtotal)));
  if (b.delivery > 0) rows.push(billRow("Delivery", `+ ${rs(b.delivery)}`));
  else rows.push(billRow("Delivery", "Free", "muted"));
  if (b.giftWrap > 0) rows.push(billRow("Gift wrap", `+ ${rs(b.giftWrap)}`));
  if (b.bookmarks > 0) rows.push(billRow("Bookmarks", `+ ${rs(b.bookmarks)}`));
  if (b.quickReads > 0)
    rows.push(billRow("QuickReads", `+ ${rs(b.quickReads)}`));
  if (b.codFee > 0) rows.push(billRow("COD handling fee", `+ ${rs(b.codFee)}`));
  if (b.offerDiscount > 0)
    rows.push(billRow("Offer discount", `− ${rs(b.offerDiscount)}`, "save"));
  if (b.couponDiscount > 0)
    rows.push(billRow("Coupon", `− ${rs(b.couponDiscount)}`, "save"));
  if (b.wallet > 0)
    rows.push(billRow("Wallet balance", `− ${rs(b.wallet)}`, "save"));
  rows.push(billRow("Total", rs(b.grand), "total"));
  if (b.advanceAmount > 0) {
    rows.push(billRow("Paid online (advance)", `− ${rs(b.advanceAmount)}`, "save"));
    rows.push(billRow("Collect at door", rs(b.payOnDelivery), "total"));
  }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:6px;">${rows.join("")}</table>`;
}

function itemsTable(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  if (!items.length) return "";
  const rows = items
    .map(
      (it) => `<tr>
      <td style="padding:6px 0;font-size:13.5px;color:#30343a;">${esc(it.name)}${it.qty > 1 ? ` × ${it.qty}` : ""}</td>
      <td style="padding:6px 0;text-align:right;font-size:13.5px;color:#30343a;">${rs(it.price)}</td>
    </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${rows}</table>`;
}

const divider = `<div style="border-top:1px solid #eee;margin:20px 0;"></div>`;
const sectionLabel = (t) =>
  `<div style="font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">${esc(t)}</div>`;

function shell(order, heading, subheading, extraTop) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f2f2f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="max-width:560px;margin:0 auto;padding:24px 12px;">
    <div style="background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e8e8e8;box-shadow:0 10px 30px rgba(0,0,0,0.06);">

      <!-- Header -->
      <div style="padding:26px 22px 20px;text-align:center;border-bottom:1px solid #f0f0f0;">
        <img src="${LOGO_URL}" width="48" height="48" alt="TheBookX" style="border-radius:13px;display:inline-block;border:1px solid #eee;" />
        <div style="font-size:21px;font-weight:800;color:${INK};letter-spacing:-0.4px;margin-top:10px;">TheBookX</div>
        <div style="font-size:11.5px;color:#9a9a9a;letter-spacing:.04em;margin-top:2px;">BOOKS, DELIVERED WITH CARE</div>
      </div>

      <!-- Body -->
      <div style="padding:24px 22px;">
        <h1 style="margin:0 0 6px;font-size:20px;font-weight:800;color:${INK};letter-spacing:-0.3px;">${esc(heading)}</h1>
        <p style="margin:0 0 16px;color:#6b6b6b;font-size:14px;line-height:1.55;">${subheading}</p>
        ${extraTop || ""}

        ${divider}
        ${sectionLabel(`Order ${order.orderId || ""}`)}
        ${itemsTable(order)}

        ${divider}
        ${sectionLabel("Bill details")}
        ${billTable(order)}

        ${
          order.orderUrl
            ? `<div style="margin-top:22px;text-align:center;">
                <a href="${esc(order.orderUrl)}" style="display:inline-block;background:${INK};color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 26px;border-radius:999px;">View your order</a>
              </div>`
            : ""
        }

        ${divider}
        ${starRow()}

        <div style="margin-top:20px;">${referBlock()}</div>
      </div>

      <!-- Footer -->
      <div style="padding:20px 22px;border-top:1px solid #f0f0f0;text-align:center;">
        <div style="font-weight:800;color:${INK};font-size:15px;letter-spacing:-0.2px;">TheBookX</div>
        <div style="margin:7px 0;font-size:12px;color:#8a8a8a;">
          <a href="${SITE_URL}" style="color:#555;text-decoration:none;">thebookx.in</a>
          &nbsp;&middot;&nbsp;
          <a href="${REVIEW_URL}" style="color:#555;text-decoration:none;">Leave a review</a>
        </div>
        <div style="font-size:11px;color:#b0b0b0;line-height:1.5;">Just reply to this email and a real person will get back to you.</div>
      </div>

    </div>
    <div style="text-align:center;color:#b5b5b5;font-size:11px;margin-top:14px;">© TheBookX · Made with care for readers 📚</div>
  </div></body></html>`;
}

function attachmentsFrom(invoiceBase64, orderId) {
  if (!invoiceBase64) return undefined;
  // Accept a raw base64 string or a data: URL.
  const content = String(invoiceBase64).replace(/^data:image\/\w+;base64,/, "");
  if (!content) return undefined;
  return [{ filename: `TheBookX-Invoice-${orderId || "order"}.png`, content }];
}

// CC a copy of every customer email to the store inbox so there's a record of
// exactly what each customer received. Set BOOKX_EMAIL_CC to change/disable.
const CC = (process.env.BOOKX_EMAIL_CC || "uskillbook@gmail.com")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

async function send({ to, subject, html, invoiceBase64, orderId }) {
  if (!resend) throw new Error("Resend not configured");
  return resend.emails.send({
    from: FROM,
    to,
    ...(CC.length ? { cc: CC } : {}),
    reply_to: REPLY_TO,
    subject,
    html,
    attachments: attachmentsFrom(invoiceBase64, orderId),
  });
}

// ── Order placed → confirmation + invoice ──
async function sendOrderConfirmationEmail({ to, order, invoiceBase64 }) {
  const b = order.bill || {};
  const sub = order.isCOD
    ? b.advanceAmount > 0
      ? `Thanks, ${esc(order.name || "there")}! Your order is confirmed. You've paid ${rs(b.advanceAmount)} online — pay ${rs(b.payOnDelivery)} to the delivery agent on arrival.`
      : `Thanks, ${esc(order.name || "there")}! Your order is confirmed. Pay ${rs(b.grand)} to the delivery agent on arrival.`
    : `Thanks, ${esc(order.name || "there")}! We've received your payment and your order is confirmed.`;
  const html = shell(order, "Order confirmed 🎉", sub);
  return send({
    to,
    subject: `Your TheBookX order ${order.orderId || ""} is confirmed`,
    html,
    invoiceBase64,
    orderId: order.orderId,
  });
}

// ── Status update (Processing / In Transit / Delivered / Cancelled …) ──
const STATUS_COPY = {
  processing: {
    h: "Your order is being packed 📦",
    s: "Good news — we're preparing your books for dispatch.",
  },
  "in transit": {
    h: "Your order is on the way 🚚",
    s: "Your parcel has been dispatched and is heading to you.",
  },
  "out for delivery": {
    h: "Out for delivery today 🛵",
    s: "Your parcel is out for delivery and should reach you soon.",
  },
  delivered: {
    h: "Delivered ✅",
    s: "Your order has been delivered. We hope you love your books!",
  },
  "money received": {
    h: "Delivered ✅",
    s: "Your order has been delivered and payment received. Enjoy your books!",
  },
  cancelled: {
    h: "Order cancelled",
    s: "This order has been cancelled. If this is a surprise, just reply and we'll help.",
  },
  unconfirmed: {
    h: "Action needed on your order",
    s: "We couldn't confirm your payment yet. Reply to this email and we'll sort it out.",
  },
};

async function sendOrderStatusEmail({
  to,
  order,
  status,
  tracking,
  invoiceBase64,
  // Optional overrides so the manage-orders template picker can control the
  // exact copy, and pass per-book review links for the "review" templates.
  heading,
  subheading,
  reviewBooks,
}) {
  const key = String(status || "").trim().toLowerCase();
  const copy =
    heading || subheading
      ? { h: heading || "", s: subheading || "" }
      : STATUS_COPY[key] || {
          h: `Order update: ${esc(status || "")}`,
          s: "Here's the latest on your order.",
        };
  let extraTop = "";
  // Per-book review buttons (Delivered / review templates).
  if (Array.isArray(reviewBooks) && reviewBooks.length) {
    const btns = reviewBooks
      .filter((b) => b && b.url)
      .map(
        (b) => `<a href="${esc(b.url)}" style="display:inline-block;margin:4px 6px 4px 0;background:#fff;border:1px solid #d8d8d8;color:${INK};text-decoration:none;font-weight:600;font-size:13px;padding:8px 13px;border-radius:999px;">&#9733; ${esc(b.name)}</a>`,
      )
      .join("");
    extraTop += `<div style="background:#fafafa;border:1px solid #ebebeb;border-radius:14px;padding:14px 16px;">
      <div style="font-size:13px;color:${INK};font-weight:700;margin-bottom:8px;">Review your books</div>
      <div>${btns}</div>
    </div>`;
  }
  const trackId = tracking && String(tracking).trim();
  if (trackId) {
    const trackUrl =
      order.trackUrl ||
      "https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx";
    extraTop += `<div style="${extraTop ? "margin-top:10px;" : ""}background:#fafafa;border:1px solid #ebebeb;border-radius:14px;padding:14px 16px;">
      <div style="font-size:11px;color:#9a9a9a;text-transform:uppercase;letter-spacing:.06em;">Tracking ID</div>
      <div style="font-size:17px;font-weight:800;color:${INK};margin-top:3px;letter-spacing:.02em;">${esc(trackId)}</div>
      <a href="${esc(trackUrl)}" style="display:inline-block;margin-top:9px;color:${INK};font-weight:700;font-size:13px;text-decoration:underline;">Track your parcel &rarr;</a>
    </div>`;
  }
  const html = shell(order, copy.h, copy.s, extraTop);
  return send({
    to,
    subject: `TheBookX order ${order.orderId || ""} — ${esc(heading || status || "update")}`,
    html,
    invoiceBase64,
    orderId: order.orderId,
  });
}

module.exports = { sendOrderConfirmationEmail, sendOrderStatusEmail };
