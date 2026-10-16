// TheBookX order emails — called by the TheBookX app (checkout) and the
// manage-orders console. Sends an order-confirmation (with the PNG invoice) or
// a status-update email via Resend from the TheBookX verified domain.
//
//   POST /api/bookxEmail/order-confirmation  { to, order, invoiceBase64? }
//   POST /api/bookxEmail/order-status        { to, order, status, tracking?, invoiceBase64? }
//
// Optional shared-secret: set BOOKX_EMAIL_SECRET and send it as the
// `x-bookx-secret` header so random callers can't send mail on your behalf.

const express = require("express");
const router = express.Router();
const {
  sendOrderConfirmationEmail,
  sendOrderStatusEmail,
} = require("../mail/orderEmails");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function guard(req, res) {
  const secret = process.env.BOOKX_EMAIL_SECRET;
  if (secret && req.get("x-bookx-secret") !== secret) {
    res.status(401).json({ success: false, error: "unauthorized" });
    return false;
  }
  return true;
}

router.post("/order-confirmation", async (req, res) => {
  if (!guard(req, res)) return;
  try {
    const { to, order, invoiceBase64 } = req.body || {};
    if (!to || !EMAIL_RE.test(String(to)))
      return res.status(400).json({ success: false, error: "valid 'to' email required" });
    if (!order || typeof order !== "object")
      return res.status(400).json({ success: false, error: "'order' object required" });
    await sendOrderConfirmationEmail({ to, order, invoiceBase64 });
    return res.json({ success: true });
  } catch (err) {
    console.error("order-confirmation email failed:", err?.message || err);
    return res.status(500).json({ success: false, error: "send failed" });
  }
});

router.post("/order-status", async (req, res) => {
  if (!guard(req, res)) return;
  try {
    const { to, order, status, tracking, invoiceBase64, heading, subheading, reviewBooks } =
      req.body || {};
    if (!to || !EMAIL_RE.test(String(to)))
      return res.status(400).json({ success: false, error: "valid 'to' email required" });
    if (!order || typeof order !== "object")
      return res.status(400).json({ success: false, error: "'order' object required" });
    await sendOrderStatusEmail({
      to,
      order,
      status,
      tracking,
      invoiceBase64,
      heading,
      subheading,
      reviewBooks,
    });
    return res.json({ success: true });
  } catch (err) {
    console.error("order-status email failed:", err?.message || err);
    return res.status(500).json({ success: false, error: "send failed" });
  }
});

module.exports = router;
