const axios = require("axios");

const sendTelegramNotification = async ({
  name,
  email,
  type,
  status,
  details,
  orderId, // added to link button actions
}) => {
  try {
    const BOT_TOKEN = process.env.JX_BOT_TELEGRAM;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    let header = "";
    if (type === "register") header = "📝 *New User Registration*";
    else if (type === "login") header = "🔐 *User Login*";
    else if (type === "payment") header = "💰 *New Payment Created*";
    else header = "📣 *JournalX Notification*";

    const message = `
${header}
━━━━━━━━━━━━━━━
👤 *Name:* ${name || "N/A"}
📧 *Email:* ${email || "N/A"}
⚙️ *Type:* ${type}
✅ *Status:* ${status}
${details ? `💬 *Details:* ${details}` : ""}
🆔 *Order ID:* ${orderId || "N/A"}
🕒 *Time:* ${new Date().toLocaleString("en-IN")}
`;

    // 🔹 Inline buttons for manual confirmation
    const inlineKeyboard =
      type === "payment"
        ? {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "✅ Mark as Paid",
                    callback_data: `payment_success_${orderId}`,
                  },
                  {
                    text: "❌ Mark as Failed",
                    callback_data: `payment_failed_${orderId}`,
                  },
                ],
              ],
            },
          }
        : {};

    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: "Markdown",
      ...inlineKeyboard,
    });
  } catch (err) {
    console.error("Telegram notification failed:", err.message);
  }
};

module.exports = { sendTelegramNotification };
