// routes/telegramRoutes.js
const express = require("express");
const axios = require("axios");
const Order = require("../model/Orders");
const router = express.Router();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const ADMIN_PIN = "123789"; // PIN for access
const TIMEFRAMES = [
  { text: "All", value: "all" },
  { text: "Last 1 hour", value: "1h" },
  { text: "Last 4 hours", value: "4h" },
  { text: "Today", value: "today" },
];

// Simple in-memory session state
const sessions = {};

/**
 * Send structured orders grouped by status
 */
async function sendOrdersSummary(chatId, orders) {
  if (!orders || orders.length === 0) {
    return axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: "No orders found for this timeframe.",
    });
  }

  const grouped = { paid: [], pending: [], failed: [] };
  orders.forEach((o) => {
    if (o.status === "paid") grouped.paid.push(o);
    else if (o.status === "failed") grouped.failed.push(o);
    else grouped.pending.push(o);
  });

  for (const [status, list] of Object.entries(grouped)) {
    if (list.length === 0) continue;
    const lines = list.map(
      (o, i) => `${i + 1}. Order #${o._id} - ${o.amount} ${o.currency}`
    );
    const text = `📌 ${status.toUpperCase()} ORDERS:\n` + lines.join("\n");

    const buttons = list.map((o) => [
      { text: `Order ${o._id}`, callback_data: `select_${o._id}` },
    ]);

    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text,
      reply_markup: { inline_keyboard: buttons },
    });
  }
}

/**
 * Webhook handler
 */
router.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    // ---------------- CALLBACK QUERY ----------------
    if (body.callback_query) {
      const cb = body.callback_query;
      const data = cb.data;
      const chatId = cb.message.chat.id;

      const [action, orderId] = data.split("_");

      if (action === "select") {
        const order = await Order.findById(orderId).lean();
        if (!order) {
          await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
            callback_query_id: cb.id,
            text: "Order not found.",
            show_alert: true,
          });
          return res.sendStatus(200);
        }

        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `What do you want to do with Order #${order._id}?`,
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "✅ Mark as Paid",
                  callback_data: `approve_${order._id}`,
                },
                {
                  text: "❌ Mark as Failed",
                  callback_data: `fail_${order._id}`,
                },
              ],
              [{ text: "📝 Details", callback_data: `view_${order._id}` }],
            ],
          },
        });

        return res.sendStatus(200);
      }

      if (action === "approve" || action === "fail") {
        const newStatus = action === "approve" ? "paid" : "failed";
        const order = await Order.findById(orderId);
        if (!order) {
          await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
            callback_query_id: cb.id,
            text: "Order not found.",
            show_alert: true,
          });
          return res.sendStatus(200);
        }

        order.status = newStatus;
        await order.save();

        await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
          callback_query_id: cb.id,
          text: `Order marked ${newStatus}`,
        });

        return res.sendStatus(200);
      }

      if (action === "view") {
        const order = await Order.findById(orderId).lean();
        if (!order) {
          await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
            callback_query_id: cb.id,
            text: "Order not found.",
            show_alert: true,
          });
          return res.sendStatus(200);
        }

        const details =
          `🔍 Order #${order._id} Details\n` +
          `Status: ${order.status}\n` +
          `Amount: ${order.amount} ${order.currency}\n` +
          `Method: ${order.method}\n` +
          `CreatedAt: ${new Date(order.createdAt).toLocaleString()}\n` +
          `Meta: ${JSON.stringify(order.meta || {})}`;

        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: details,
        });

        return res.sendStatus(200);
      }

      // Timeframe callback
      if (action === "timeframe") {
        const timeframe = orderId; // after "timeframe_" callback
        const now = new Date();
        let query = {};
        if (timeframe === "1h")
          query.createdAt = { $gte: new Date(now - 60 * 60 * 1000) };
        else if (timeframe === "4h")
          query.createdAt = { $gte: new Date(now - 4 * 60 * 60 * 1000) };
        else if (timeframe === "today") {
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          query.createdAt = { $gte: start };
        }

        const orders = await Order.find(query).sort({ createdAt: -1 }).lean();
        await sendOrdersSummary(chatId, orders);

        await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
          callback_query_id: cb.id,
          text: `Showing orders for ${timeframe}`,
        });

        return res.sendStatus(200);
      }
    }

    // ---------------- STANDARD MESSAGE ----------------
    if (body.message && body.message.text) {
      const chatId = body.message.chat.id;
      const text = body.message.text.trim();

      if (!sessions[chatId]) sessions[chatId] = { stage: "start" };
      const session = sessions[chatId];

      if (text === "/start") {
        session.stage = "awaiting_pin";
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: "Welcome! Please enter your PIN to continue.",
        });
        return res.sendStatus(200);
      }

      if (session.stage === "awaiting_pin") {
        if (text === ADMIN_PIN) {
          session.stage = "awaiting_timeframe";
          await axios.post(`${TELEGRAM_API}/sendMessage`, {
            chat_id: chatId,
            text: "PIN verified! Select timeframe for orders:",
            reply_markup: {
              inline_keyboard: TIMEFRAMES.map((t) => [
                { text: t.text, callback_data: `timeframe_${t.value}` },
              ]),
            },
          });
        } else {
          await axios.post(`${TELEGRAM_API}/sendMessage`, {
            chat_id: chatId,
            text: "Incorrect PIN. Try again.",
          });
        }
        return res.sendStatus(200);
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Telegram webhook error", err);
    res.sendStatus(500);
  }
});

module.exports = router;
