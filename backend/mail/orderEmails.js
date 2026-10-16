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
const BRAND = "#fb8500";

const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
const rs = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

// One bill line (label + amount). `tone`: "muted" | "save" | "total".
function billRow(label, amount, tone) {
  const color =
    tone === "save" ? "#0a8f0c" : tone === "muted" ? "#6b7280" : "#0a0a0a";
  const weight = tone === "total" ? "700" : "500";
  const size = tone === "total" ? "16px" : "13.5px";
  return `<tr>
    <td style="padding:5px 0;color:${tone === "muted" ? "#6b7280" : "#30343a"};font-size:${size};">${esc(label)}</td>
    <td style="padding:5px 0;text-align:right;color:${color};font-weight:${weight};font-size:${size};">${esc(amount)}</td>
  </tr>`;
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
  else rows.push(billRow("Delivery", "FREE", "save"));
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

function shell(order, heading, subheading, extraTop) {
  return `<!doctype html><html><body style="margin:0;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:20px 12px;">
    <div style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #ececec;">
      <div style="background:${BRAND};padding:18px 22px;">
        <div style="color:#fff;font-size:20px;font-weight:800;">TheBookX</div>
      </div>
      <div style="padding:22px;">
        <h1 style="margin:0 0 4px;font-size:19px;color:#0a0a0a;">${esc(heading)}</h1>
        <p style="margin:0 0 14px;color:#6b7280;font-size:14px;line-height:1.5;">${subheading}</p>
        ${extraTop || ""}
        <div style="border-top:1px dashed #e3e3e3;margin:16px 0;"></div>
        <div style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;">Order ${esc(order.orderId || "")}</div>
        ${itemsTable(order)}
        <div style="border-top:1px dashed #e3e3e3;margin:14px 0;"></div>
        <div style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px;">Bill details</div>
        ${billTable(order)}
        ${
          order.orderUrl
            ? `<div style="margin-top:20px;text-align:center;">
                <a href="${esc(order.orderUrl)}" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:11px 22px;border-radius:10px;">View your order</a>
              </div>`
            : ""
        }
      </div>
      <div style="padding:16px 22px;background:#fafafa;border-top:1px solid #ececec;color:#9ca3af;font-size:12px;line-height:1.5;">
        Questions? Just reply to this email — it reaches us directly.<br/>Thank you for shopping with TheBookX. 📚
      </div>
    </div>
  </div></body></html>`;
}

function attachmentsFrom(invoiceBase64, orderId) {
  if (!invoiceBase64) return undefined;
  // Accept a raw base64 string or a data: URL.
  const content = String(invoiceBase64).replace(/^data:image\/\w+;base64,/, "");
  if (!content) return undefined;
  return [{ filename: `TheBookX-Invoice-${orderId || "order"}.png`, content }];
}

async function send({ to, subject, html, invoiceBase64, orderId }) {
  if (!resend) throw new Error("Resend not configured");
  return resend.emails.send({
    from: FROM,
    to,
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

async function sendOrderStatusEmail({ to, order, status, tracking, invoiceBase64 }) {
  const key = String(status || "").trim().toLowerCase();
  const copy =
    STATUS_COPY[key] || {
      h: `Order update: ${esc(status || "")}`,
      s: "Here's the latest on your order.",
    };
  let extraTop = "";
  const trackId = tracking && String(tracking).trim();
  if (trackId) {
    const trackUrl =
      order.trackUrl ||
      "https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx";
    extraTop = `<div style="background:#fff4e9;border:1px solid #ffd9ad;border-radius:12px;padding:12px 14px;">
      <div style="font-size:12px;color:#b4560a;text-transform:uppercase;letter-spacing:.04em;">Tracking ID</div>
      <div style="font-size:16px;font-weight:800;color:#0a0a0a;margin-top:2px;">${esc(trackId)}</div>
      <a href="${esc(trackUrl)}" style="display:inline-block;margin-top:8px;color:#b4560a;font-weight:700;font-size:13px;text-decoration:none;">Track on India Post →</a>
    </div>`;
  }
  const html = shell(order, copy.h, copy.s, extraTop);
  return send({
    to,
    subject: `TheBookX order ${order.orderId || ""} — ${status || "update"}`,
    html,
    invoiceBase64,
    orderId: order.orderId,
  });
}

module.exports = { sendOrderConfirmationEmail, sendOrderStatusEmail };
