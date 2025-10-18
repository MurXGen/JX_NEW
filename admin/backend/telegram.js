const axios = require("axios");
const Order = require("./models/Order");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID; // fallback

async function sendOrderToTelegram(order) {
  const text = `
🧾 <b>Order ID:</b> ${order._id}
👤 <b>User:</b> ${order.userEmail || order.userId}
💰 <b>Amount:</b> ${order.amount}
📦 <b>Status:</b> ${order.status}
`;

  const reply_markup = {
    inline_keyboard: [
      [
        { text: "✅ Mark as Paid", callback_data: `approve_${order._id}` },
        { text: "❌ Mark as Failed", callback_data: `fail_${order._id}` },
        { text: "✏️ Edit Status", callback_data: `edit_${order._id}` },
      ],
    ],
  };

  // sendMessage returns result with message_id
  const resp = await axios.post(`${TELEGRAM_API}/sendMessage`, {
    chat_id: order.telegramChatId || ADMIN_CHAT_ID,
    text,
    parse_mode: "HTML",
    reply_markup,
  });

  const messageId = resp.data.result.message_id;
  // persist message id to order
  await Order.findByIdAndUpdate(order._id, { telegramMessageId: messageId });

  return resp.data.result;
}

async function handleCallbackQuery(body) {
  // body is the telegram update payload (req.body)
  const callback = body.callback_query;
  if (!callback) return { ok: false };

  const adminTelegramId = callback.from.id;
  // Optional: check admin identity before allowing change
  if (
    String(adminTelegramId) !== String(process.env.TELEGRAM_ADMIN_CHAT_ID) &&
    !isAdminAllowed(adminTelegramId)
  ) {
    // answer callback with error
    await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
      callback_query_id: callback.id,
      text: "Unauthorized",
      show_alert: true,
    });
    return { ok: false, reason: "unauthorized" };
  }

  const [action, orderId] = callback.data.split("_");
  let newStatus;
  if (action === "approve") newStatus = "success";
  else if (action === "fail") newStatus = "failed";
  else if (action === "edit") newStatus = "needs_manual_edit";
  else newStatus = "pending";

  // update DB
  const order = await Order.findByIdAndUpdate(
    orderId,
    { status: newStatus },
    { new: true }
  );
  if (!order) {
    await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
      callback_query_id: callback.id,
      text: "Order not found",
      show_alert: true,
    });
    return { ok: false };
  }

  // Edit the original message text to reflect new status
  const chatId = callback.message.chat.id;
  const messageId = callback.message.message_id;
  const newText = `
🧾 <b>Order ID:</b> ${order._id}
👤 <b>User:</b> ${order.userEmail || order.userId}
💰 <b>Amount:</b> ${order.amount}
📦 <b>Status:</b> ${order.status}
  `;
  await axios.post(`${TELEGRAM_API}/editMessageText`, {
    chat_id: chatId,
    message_id: messageId,
    text: newText,
    parse_mode: "HTML",
  });

  // Acknowledge the button press (small toast in telegram)
  await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
    callback_query_id: callback.id,
    text: `Order marked as ${newStatus}`,
    show_alert: false,
  });

  return { ok: true, order };
}

// utility for admin list - adjust as needed
function isAdminAllowed(id) {
  const extraAdmins = (process.env.TELEGRAM_EXTRA_ADMINS || "")
    .split(",")
    .filter(Boolean);
  return extraAdmins.includes(String(id));
}

module.exports = { sendOrderToTelegram, handleCallbackQuery };
