const express = require("express");
const axios = require("axios");
const Order = require("../models/Orders");

const router = express.Router();

router.post("/webhook", async (req, res) => {
  const body = req.body;

  console.log("📩 Incoming Telegram Webhook:", JSON.stringify(body, null, 2));

  if (body.callback_query) {
    const { id, data, message } = body.callback_query;
    const chatId = message.chat.id;
    const BOT_TOKEN = process.env.JX_BOT_TELEGRAM;

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

        await axios.post(
          `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
          {
            chat_id: chatId,
            text: `✅ Order *${orderId}* marked as *PAID*.`,
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
