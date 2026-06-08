const axios = require("axios");

/**
 * Registers the Telegram webhook so button presses (Mark as Paid / Failed)
 * are delivered to /api/telegram/webhook. Without this, the bot can SEND
 * messages but never RECEIVES the inline-button callbacks, so nothing updates.
 *
 * Set one of these env vars to your PUBLIC backend base URL:
 *   TELEGRAM_WEBHOOK_URL  → full URL, e.g. https://api.journalx.app/api/telegram/webhook
 *   PUBLIC_BACKEND_URL    → base, e.g. https://api.journalx.app  (we append the path)
 */
async function initTelegramWebhook() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("⚠️ TELEGRAM_BOT_TOKEN missing — skipping webhook setup");
    return;
  }

  let url = process.env.TELEGRAM_WEBHOOK_URL;
  if (!url && process.env.PUBLIC_BACKEND_URL) {
    url = `${process.env.PUBLIC_BACKEND_URL.replace(/\/$/, "")}/api/telegram/webhook`;
  }

  try {
    // Always log current status so prod logs reveal misconfig + last error.
    const info = await axios.get(
      `https://api.telegram.org/bot${token}/getWebhookInfo`,
    );
    console.log("📡 Telegram webhook info:", JSON.stringify(info.data?.result || {}));

    if (!url) {
      console.warn(
        "⚠️ No TELEGRAM_WEBHOOK_URL / PUBLIC_BACKEND_URL set — cannot auto-register webhook. " +
          "Button callbacks won't be delivered until you set it.",
      );
      return;
    }

    const current = info.data?.result?.url;
    if (current === url) {
      console.log("✅ Telegram webhook already set:", url);
      return;
    }

    const res = await axios.post(
      `https://api.telegram.org/bot${token}/setWebhook`,
      { url, allowed_updates: ["message", "callback_query"] },
    );
    console.log("✅ Telegram webhook set →", url, JSON.stringify(res.data));
  } catch (err) {
    console.error(
      "❌ Telegram webhook setup failed:",
      err.response?.data?.description || err.message,
    );
  }
}

module.exports = { initTelegramWebhook };
