const express = require("express");
const router = express.Router();
const axios = require("axios");

// POST /api/telegram/review
router.post("/review", async (req, res) => {
  try {
    const { bookId, review } = req.body;

    // Validate input
    if (!bookId || !review) {
      return res.status(400).json({
        message: "Missing fields",
        required: ["bookId", "review"],
      });
    }

    // Check environment variables
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!TELEGRAM_BOT_TOKEN || !CHAT_ID) {
      console.error("Missing Telegram configuration:", {
        hasToken: !!TELEGRAM_BOT_TOKEN,
        hasChatId: !!CHAT_ID,
      });
      return res.status(500).json({
        message: "Server configuration error",
        details: "Telegram credentials not configured",
      });
    }

    // Format the message
    const message = `
📚 *New Book Review*

🆔 *Book ID:* ${bookId}

📝 *Review:*
${review}

—
Sent from JournalX App
    `;

    // Send to Telegram
    const telegramResponse = await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: CHAT_ID,
        text: message,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      },
      {
        timeout: 10000, // 10 second timeout
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    // Check if Telegram request was successful
    if (telegramResponse.data && telegramResponse.data.ok) {
      return res.status(200).json({
        success: true,
        message: "Review submitted successfully!",
      });
    } else {
      throw new Error("Telegram API returned unexpected response");
    }
  } catch (err) {
    // Detailed error logging
    console.error("Error in /review endpoint:", {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
      config: {
        url: err.config?.url,
        method: err.config?.method,
        hasToken: !!process.env.TELEGRAM_BOT_TOKEN,
        hasChatId: !!process.env.TELEGRAM_CHAT_ID,
      },
    });

    // Send appropriate error response
    if (err.response) {
      // Telegram API error
      const statusCode = err.response.status;
      const errorData = err.response.data;

      if (statusCode === 401) {
        return res.status(500).json({
          message: "Invalid Telegram bot token",
          details: "Please check your TELEGRAM_BOT_TOKEN",
        });
      } else if (statusCode === 400) {
        return res.status(500).json({
          message: "Invalid request to Telegram",
          details: errorData.description || "Please check CHAT_ID",
        });
      } else {
        return res.status(500).json({
          message: "Telegram API error",
          details: errorData.description || "Unknown error",
        });
      }
    } else if (err.request) {
      // Network error
      return res.status(500).json({
        message: "Network error - Cannot reach Telegram API",
        details: err.message,
      });
    } else {
      // Other errors
      return res.status(500).json({
        message: "Internal server error",
        details: err.message,
      });
    }
  }
});

module.exports = router;
