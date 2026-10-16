const express = require("express");
const axios = require("axios");
const Order = require("../models/Orders");
const User = require("../models/User");
const {
  updateUserAfterCryptoPayment,
} = require("../utils/updateUserAfterCryptoPayment");

const router = express.Router();

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
