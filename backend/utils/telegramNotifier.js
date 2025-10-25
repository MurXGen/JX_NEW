const axios = require("axios");

const sendTelegramNotification = async ({
  name,
  email,
  type,
  status,
  details,
}) => {
  try {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
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

module.exports = { sendTelegramNotification };
