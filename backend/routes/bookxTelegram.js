// routes/review.js
const express = require("express");
const router = express.Router();
const axios = require("axios");

// POST /api/bookxTelegram/store-review
router.post("/store-review", async (req, res) => {
  try {
    const { review, rating, phoneNumber } = req.body;

    if (!review || !rating) {
      return res.status(400).json({
        message: "Missing fields",
        required: ["review", "rating"],
      });
    }

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

    const stars = "⭐".repeat(rating);
    const message = `
🏪 *New Store Review*

⭐ *Rating:* ${rating}/5 ${stars}

📝 *Review:*
${review}

${phoneNumber ? `📱 *Phone:* ${phoneNumber}\n🎁 *Entered in Lucky Draw*` : ""}

—
Sent from TheBookX Review System
    `;

    const telegramResponse = await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: CHAT_ID,
        text: message,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      },
      {
        timeout: 10000,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (telegramResponse.data && telegramResponse.data.ok) {
      return res.status(200).json({
        success: true,
        message: "Store review submitted successfully!",
      });
    } else {
      throw new Error("Telegram API returned unexpected response");
    }
  } catch (err) {
    console.error("Error in /store-review:", {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    });

    if (err.response) {
      const statusCode = err.response.status;
      if (statusCode === 401) {
        return res.status(500).json({
          message: "Invalid Telegram bot token",
        });
      } else if (statusCode === 400) {
        return res.status(500).json({
          message: "Invalid request to Telegram",
        });
      }
    }

    return res.status(500).json({
      message: "Internal server error. Please try again.",
    });
  }
});

// POST /api/bookxTelegram/review
router.post("/review", async (req, res) => {
  try {
    const { bookId, review, rating, phoneNumber } = req.body;

    if (!bookId || !review || !rating) {
      return res.status(400).json({
        message: "Missing fields",
        required: ["bookId", "review", "rating"],
      });
    }

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

    const stars = "⭐".repeat(rating);
    const message = `
📚 *New Book Review*

🆔 *Book ID:* ${bookId}
⭐ *Rating:* ${rating}/5 ${stars}

📝 *Review:*
${review}

${phoneNumber ? `📱 *Phone:* ${phoneNumber}\n🎁 *Entered in Lucky Draw*` : ""}

—
Sent from TheBookX Review System
    `;

    const telegramResponse = await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: CHAT_ID,
        text: message,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      },
      {
        timeout: 10000,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (telegramResponse.data && telegramResponse.data.ok) {
      return res.status(200).json({
        success: true,
        message: "Book review submitted successfully!",
      });
    } else {
      throw new Error("Telegram API returned unexpected response");
    }
  } catch (err) {
    console.error("Error in /review:", {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    });

    if (err.response) {
      const statusCode = err.response.status;
      if (statusCode === 401) {
        return res.status(500).json({
          message: "Invalid Telegram bot token",
        });
      } else if (statusCode === 400) {
        return res.status(500).json({
          message: "Invalid request to Telegram",
        });
      }
    }

    return res.status(500).json({
      message: "Internal server error. Please try again.",
    });
  }
});

// POST /api/bookxTelegram/phone
router.post("/phone", async (req, res) => {
  try {
    const { phoneNumber, type } = req.body;

    if (!phoneNumber || !/^\d{10}$/.test(phoneNumber)) {
      return res.status(400).json({
        message: "Invalid phone number. Please enter a 10-digit number.",
      });
    }

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

    const message = `
🎁 *New Lucky Draw Entry*

📱 *Phone:* ${phoneNumber}
📋 *Entry Type:* ${type === "store" ? "Store Review" : "Book Review"}
🕐 *Time:* ${new Date().toLocaleString()}

—
Entered for ₹499 Books Set Giveaway
    `;

    const telegramResponse = await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: CHAT_ID,
        text: message,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      },
      {
        timeout: 10000,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (telegramResponse.data && telegramResponse.data.ok) {
      return res.status(200).json({
        success: true,
        message: "Phone number saved for lucky draw!",
      });
    } else {
      throw new Error("Telegram API returned unexpected response");
    }
  } catch (err) {
    console.error("Error in /phone:", {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    });

    if (err.response) {
      const statusCode = err.response.status;
      if (statusCode === 401) {
        return res.status(500).json({
          message: "Invalid Telegram bot token",
        });
      } else if (statusCode === 400) {
        return res.status(500).json({
          message: "Invalid request to Telegram",
        });
      }
    }

    return res.status(500).json({
      message: "Failed to save number. Please try again.",
    });
  }
});

module.exports = router;
