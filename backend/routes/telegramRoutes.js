const Order = require("../models/Orders");
const Plan = require("../models/Plan");
const User = require("../models/User");
const express = require("express");
const router = express.Router();

router.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.callback_query) {
    const { id, data, message } = body.callback_query;
    const chatId = message.chat.id;

    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

    try {
      if (data.startsWith("payment_success_")) {
        const orderId = data.split("payment_success_")[1];
        await Order.findByIdAndUpdate(orderId, { status: "paid" });
        await axios.post(
          `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
          {
            chat_id: chatId,
            text: `✅ Order *${orderId}* marked as *PAID*.`,
            parse_mode: "Markdown",
          }
        );
      } else if (data.startsWith("payment_failed_")) {
        const orderId = data.split("payment_failed_")[1];
        await Order.findByIdAndUpdate(orderId, { status: "failed" });
        await axios.post(
          `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
          {
            chat_id: chatId,
            text: `❌ Order *${orderId}* marked as *FAILED*.`,
            parse_mode: "Markdown",
          }
        );
      }

      // Acknowledge callback so Telegram removes loading spinner
      await axios.post(
        `https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`,
        {
          callback_query_id: id,
        }
      );
    } catch (error) {
      console.error("Telegram webhook error:", error.message);
    }
  }

  res.sendStatus(200);
});

module.exports = router;
