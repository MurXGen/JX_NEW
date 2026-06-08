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
