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
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

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

    // Fire-and-forget: notifications must never block (or fail) the request
    // that triggered them — e.g. login/register. We don't await the network
    // call, and we cap it with a short timeout so a flaky/unreachable Telegram
    // (ETIMEDOUT on local dev) can't stall the response.
    axios
      .post(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
        {
          chat_id: CHAT_ID,
          text: message,
          // no parse_mode → plain text, can't be rejected for bad entities
          ...inlineKeyboard,
        },
        { timeout: 4000 },
      )
      .catch((err) =>
        console.error(
          "Telegram notification failed:",
          err.response?.data?.description || err.message,
        ),
      );
  } catch (err) {
    console.error(
      "Telegram notification failed:",
      err.response?.data?.description || err.message,
    );
  }
};

module.exports = { sendTelegramNotification };
