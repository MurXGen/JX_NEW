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
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    // Payments go to the dedicated payments chat; everything else to the
    // general chat. Falls back to the general chat if the payments one
    // isn't configured.
    const CHAT_ID =
      type === "payment"
        ? process.env.TELEGRAM_PAYMENTS_CHAT_ID || process.env.TELEGRAM_CHAT_ID
        : process.env.TELEGRAM_CHAT_ID;

    let header = "";
    if (type === "register") header = "📝 New User Registration";
    else if (type === "login") header = "🔐 User Login";
    else if (type === "payment") header = "💰 New Payment Created";
    else header = "📣 JournalX Notification";

    // NOTE: sent as PLAIN TEXT (no parse_mode). Crypto addresses and order
    // IDs contain underscores/special chars that break Telegram's Markdown
    // parser, which silently rejected the whole message (400). Plain text is
    // immune to that.
    const message = [
      header,
      "━━━━━━━━━━━━━━━",
      `👤 Name: ${name || "N/A"}`,
      `📧 Email: ${email || "N/A"}`,
      `⚙️ Type: ${type}`,
      `✅ Status: ${status}`,
      details ? `💬 Details:\n${details}` : null,
      `🆔 Order ID: ${orderId || "N/A"}`,
      `🕒 Time: ${new Date().toLocaleString("en-IN")}`,
    ]
      .filter(Boolean)
      .join("\n");

    // 🔹 Inline buttons for manual confirmation
    const inlineKeyboard =
      type === "payment" && orderId
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

    if (!BOT_TOKEN || !CHAT_ID) {
      console.error(
        "Telegram env missing:",
        !BOT_TOKEN ? "TELEGRAM_BOT_TOKEN" : "",
        !CHAT_ID ? "TELEGRAM_CHAT_ID" : "",
      );
      return;
    }

    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
      // no parse_mode → plain text, can't be rejected for bad entities
      ...inlineKeyboard,
    });
  } catch (err) {
    console.error(
      "Telegram notification failed:",
      err.response?.data?.description || err.message,
    );
  }
};

module.exports = { sendTelegramNotification };
