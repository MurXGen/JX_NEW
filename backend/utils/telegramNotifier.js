const axios = require("axios");

export const sendTelegramNotification = async ({
  name,
  email,
  type,
  status,
}) => {
  try {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    const message = `
📣 *JournalX User ${type === "register" ? "Registration" : "Login"}*
━━━━━━━━━━━━━━━
👤 *Name:* ${name || "N/A"}
📧 *Email:* ${email}
⚙️ *Type:* ${type}
✅ *Status:* ${status}
🕒 *Time:* ${new Date().toLocaleString("en-IN")}
`;

    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: "Markdown",
    });
  } catch (err) {
    console.error("Telegram notification failed:", err.message);
  }
};
