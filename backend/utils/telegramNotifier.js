// utils/telegramNotifier.js
const axios = require("axios");

const sendTelegramNotification = async ({
  chatId = process.env.TELEGRAM_CHAT_ID, // default user notifications group
  name,
  email,
  type,
  status,
  message, // optional custom message
}) => {
  try {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

    const msg =
      message ||
      `
📣 *JournalX User ${type === "register" ? "Registration" : "Login"}*
━━━━━━━━━━━━━━━
👤 *Name:* ${name || "N/A"}
📧 *Email:* ${email}
⚙️ *Type:* ${type}
✅ *Status:* ${status}
🕒 *Time:* ${new Date().toLocaleString("en-IN")}
`;

    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: chatId,
      text: msg,
      parse_mode: "Markdown",
    });
  } catch (err) {
    console.error("Telegram notification failed:", err.message);
  }
};

module.exports = { sendTelegramNotification };
