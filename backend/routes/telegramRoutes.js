const express = require("express");
const axios = require("axios");
const Order = require("../models/Orders");
const User = require("../models/User");
const {
  updateUserAfterCryptoPayment,
} = require("../utils/updateUserAfterCryptoPayment");

const router = express.Router();

// TheBookX QuickReads Google Form (same form the storefront submits to).
const QR_FORM_URL =
  process.env.THEBOOKX_QR_FORM_URL ||
  "https://docs.google.com/forms/d/e/1FAIpQLSdvvTVLhLx9ZsJYGmpoU4S69UL-ch86CjwV_4Ywzy-YYbOYPA/formResponse";
const QR_FORM_FIELDS = {
  timestamp: "entry.545632713",
  name: "entry.830451727",
  mobile: "entry.1220930407",
  bookId: "entry.590206605",
  bookName: "entry.211134755",
  amount: "entry.944113587",
  paymentMethod: "entry.101514473",
  paymentStatus: "entry.1612784704",
  approvalStatus: "entry.837917910",
  txnRef: "entry.274318451",
};

// 🔧 Diagnostics — open in a browser to debug delivery in prod.
// GET /api/telegram/info  → shows whether the webhook is registered + last error
// GET /api/telegram/test  → sends a test message to your chat
router.get("/info", async (req, res) => {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const r = await axios.get(
      `https://api.telegram.org/bot${token}/getWebhookInfo`,
    );
    res.json({
      hasToken: !!token,
      hasChatId: !!process.env.TELEGRAM_CHAT_ID,
      webhook: r.data?.result,
    });
  } catch (e) {
    res.status(500).json({ error: e.response?.data || e.message });
  }
});

router.get("/test", async (req, res) => {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
      return res.status(400).json({
        ok: false,
        message: "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in env",
        hasToken: !!token,
        hasChatId: !!chatId,
      });
    }
    const r = await axios.post(
      `https://api.telegram.org/bot${token}/sendMessage`,
      { chat_id: chatId, text: "✅ JournalX Telegram test message — delivery works." },
    );
    res.json({ ok: true, result: r.data });
  } catch (e) {
    // Surfaces "chat not found" / "bot was blocked" / bad token, etc.
    res.status(500).json({ ok: false, error: e.response?.data || e.message });
  }
});

router.post("/webhook", async (req, res) => {
  const body = req.body;

  console.log("📩 Incoming Telegram Webhook:", JSON.stringify(body, null, 2));

  if (body.callback_query) {
    const { id, data, message } = body.callback_query;
    const chatId = message.chat.id;
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

    console.log("🟦 Callback Data Received:", data);

    try {
      let orderId;
      let updateResult;

      if (data.startsWith("payment_success_")) {
        orderId = data.replace("payment_success_", "").trim();
        console.log(`✅ Marking Order ${orderId} as PAID...`);

        updateResult = await Order.findByIdAndUpdate(
          orderId,
          { status: "paid" },
          { new: true },
        );

        console.log("🟢 DB Update Result:", updateResult);

        // 🔥 Activate the user's subscription immediately so it doesn't depend
        // on the frontend polling loop. The waiting page's verify-payment poll
        // will then succeed and redirect the user.
        let activated = false;
        try {
          if (updateResult?.userId) {
            const user = await User.findById(updateResult.userId);
            if (user) {
              await updateUserAfterCryptoPayment(user, updateResult);
              await user.save();
              activated = true;
              console.log("🟢 Subscription activated for", user.email);
            }
          }
        } catch (e) {
          console.error("⚠️ Subscription activation failed:", e.message);
        }

        await axios.post(
          `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
          {
            chat_id: chatId,
            text: activated
              ? `✅ Order *${orderId}* marked as *PAID* and subscription activated.`
              : `✅ Order *${orderId}* marked as *PAID*. ⚠️ Could not auto-activate the subscription — check logs.`,
            parse_mode: "Markdown",
          },
        );
      } else if (data.startsWith("payment_failed_")) {
        orderId = data.replace("payment_failed_", "").trim();
        console.log(`❌ Marking Order ${orderId} as FAILED...`);

        updateResult = await Order.findByIdAndUpdate(
          orderId,
          { status: "failed" },
          { new: true },
        );

        console.log("🔴 DB Update Result:", updateResult);

        await axios.post(
          `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
          {
            chat_id: chatId,
            text: `❌ Order *${orderId}* marked as *FAILED*.`,
            parse_mode: "Markdown",
          },
        );
      } else if (
        data.startsWith("bookx_pass_") ||
        data.startsWith("bookx_fail_")
      ) {
        // ── TheBookX order (UPI QR) Passed / Failed ──────────────────────────
        // Unlike crypto (Mongo), the TheBookX order status lives in a Google
        // Sheet. We update it through TheBookX's own public order-write proxy
        // (which talks to its Apps Script), so the sheet URL stays on their
        // side. Passed → "Processing" (the shopper's verify-poll then flips the
        // checkout screen to success); Failed → "Unconfirmed".
        const passed = data.startsWith("bookx_pass_");
        orderId = data
          .replace(passed ? "bookx_pass_" : "bookx_fail_", "")
          .trim();
        // Passed → "Processing" (confirmed). Failed → still UNCONFIRMED, but
        // tagged so the shopper's live poll can tell an explicit failure apart
        // from the initial pending state (both plain "Unconfirmed" otherwise).
        // The word "Unconfirmed" keeps manage-orders treating it as unconfirmed.
        const newStatus = passed ? "Processing" : "Unconfirmed (Payment Failed)";
        const base = (
          process.env.THEBOOKX_API_BASE || "https://thebookx.in"
        ).replace(/\/$/, "");
        console.log(
          `📘 TheBookX order ${orderId} → ${newStatus} (via ${base})`,
        );

        let ok = false;
        try {
          const r = await axios.post(
            `${base}/api/order-write`,
            {
              action: "update",
              orderId,
              data: { "Order Status": newStatus },
            },
            { timeout: 10000 },
          );
          ok = !!r.data?.success;
        } catch (e) {
          console.error(
            "🚨 TheBookX order-write failed:",
            e.response?.data || e.message,
          );
        }

        // Remove the buttons so the decision can't be flipped by a double-tap.
        try {
          await axios.post(
            `https://api.telegram.org/bot${BOT_TOKEN}/editMessageReplyMarkup`,
            {
              chat_id: chatId,
              message_id: message.message_id,
              reply_markup: { inline_keyboard: [] },
            },
          );
        } catch {}

        await axios.post(
          `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
          {
            chat_id: chatId,
            text: ok
              ? `${passed ? "✅" : "❌"} TheBookX order ${orderId} marked ${newStatus}.`
              : `⚠️ Couldn't update TheBookX order ${orderId} (${newStatus}) — check logs.`,
          },
        );
      } else if (data === "qr_pass" || data === "qr_fail") {
        // ── TheBookX QuickReads (UPI QR) Passed / Failed ─────────────────────
        // QuickReads orders live in their own Google Form sheet. With the
        // QuickReads Apps Script configured, a tap updates the order rows in
        // place; without it, it appends a verified / failed form row per book.
        // TheBookX's checkout polls that sheet: verified unlocks the book,
        // failed shows "Payment failed". Book ids + phone come from QR-REF.
        const passed = data === "qr_pass";
        const text = message.text || "";
        const ref = text.match(/QR-REF:\s*(\d{10})\s*·\s*([A-Za-z0-9,\-]+)\s*·\s*(\d+)/);
        const name = (text.match(/Name:\s*(.+)/) || [])[1]?.trim() || "";
        let ok = false;
        let count = 0;
        if (ref) {
          const [, mobile, idList, total] = ref;
          const ids = idList.split(",").filter(Boolean);
          const each = ids.length ? Math.round(Number(total) / ids.length) : 0;
          const scriptUrl = process.env.THEBOOKX_QR_APPSCRIPT_URL;
          try {
            if (scriptUrl) {
              // Preferred: the QuickReads Apps Script updates the order rows in
              // place (docs/quickreads-apps-script.gs in the TheBookX repo).
              const params = new URLSearchParams({
                action: "setStatus",
                secret: process.env.THEBOOKX_QR_APPSCRIPT_SECRET || "",
                mobile,
                name,
                bookIds: ids.join(","),
                paymentStatus: passed ? "Paid (verified)" : "Payment failed",
                approvalStatus: passed ? "Approved" : "Rejected",
                txnRef: passed ? "Telegram: passed" : "Telegram: failed",
              });
              const r = await axios.post(scriptUrl, params.toString(), {
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                timeout: 15000,
              });
              count = r.data?.ok ? ids.length : 0;
              if (!r.data?.ok)
                console.error("🚨 QuickReads Apps Script:", r.data?.error || r.data);
            } else {
              // Fallback (no Apps Script configured): append a form row per book.
              for (const bookId of ids) {
                const values = {
                  timestamp: new Date().toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                  }),
                  name,
                  mobile,
                  bookId,
                  bookName: bookId.startsWith("SUB-") ? bookId : "",
                  amount: String(each),
                  paymentMethod: "UPI Payment",
                  paymentStatus: passed ? "Paid (verified)" : "Payment failed",
                  approvalStatus: passed ? "Approved" : "Rejected",
                  txnRef: passed ? "Telegram: passed" : "Telegram: failed",
                };
                const params = new URLSearchParams();
                Object.entries(QR_FORM_FIELDS).forEach(([k, entry]) => {
                  if (values[k]) params.append(entry, values[k]);
                });
                await axios.post(QR_FORM_URL, params.toString(), {
                  headers: { "Content-Type": "application/x-www-form-urlencoded" },
                  timeout: 10000,
                });
                count++;
              }
            }
            ok = count === ids.length;
          } catch (e) {
            console.error("🚨 QuickReads form submit failed:", e.message);
          }
        } else {
          console.warn("⚠️ QuickReads tap without a QR-REF line");
        }

        // Remove the buttons so the decision can't be flipped by a double-tap.
        if (ok) {
          try {
            await axios.post(
              `https://api.telegram.org/bot${BOT_TOKEN}/editMessageReplyMarkup`,
              {
                chat_id: chatId,
                message_id: message.message_id,
                reply_markup: { inline_keyboard: [] },
              },
            );
          } catch {}
        }

        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          chat_id: chatId,
          text: ok
            ? `${passed ? "✅" : "❌"} QuickReads for ${ref[1]} marked ${passed ? "PASSED, access unlocked" : "FAILED"}.`
            : `⚠️ Couldn't update the QuickReads order${ref ? ` for ${ref[1]}` : ""} — check logs.`,
        });
      } else {
        console.warn("⚠️ Unknown callback data:", data);
      }

      // Acknowledge the callback (removes the loading spinner in Telegram)
      await axios.post(
        `https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`,
        {
          callback_query_id: id,
        },
      );
    } catch (error) {
      console.error("🚨 Telegram webhook error:", error.message);
    }
  } else {
    console.warn("⚠️ No callback_query found in request body");
  }

  res.sendStatus(200);
});

module.exports = router;
