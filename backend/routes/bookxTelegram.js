// routes/review.js
const express = require("express");
const router = express.Router();
const axios = require("axios");

// POST /api/review/store
router.post("/store", async (req, res) => {
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
      return res.status(500).json({
        message: "Server configuration error",
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

    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: CHAT_ID,
        text: message,
        parse_mode: "Markdown",
      },
      { timeout: 10000 },
    );

    return res.status(200).json({
      success: true,
      message: "Store review submitted successfully!",
    });
  } catch (err) {
    console.error("Error in /store review:", err);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

// POST /api/review/book
router.post("/book", async (req, res) => {
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
      return res.status(500).json({
        message: "Server configuration error",
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

    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: CHAT_ID,
        text: message,
        parse_mode: "Markdown",
      },
      { timeout: 10000 },
    );

    return res.status(200).json({
      success: true,
      message: "Book review submitted successfully!",
    });
  } catch (err) {
    console.error("Error in /book review:", err);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

// POST /api/review/phone
router.post("/phone", async (req, res) => {
  try {
    const { phoneNumber, type } = req.body;

    if (!phoneNumber || !/^\d{10}$/.test(phoneNumber)) {
      return res.status(400).json({
        message: "Invalid phone number",
      });
    }

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!TELEGRAM_BOT_TOKEN || !CHAT_ID) {
      return res.status(500).json({
        message: "Server configuration error",
      });
    }

    const message = `
🎁 *New Lucky Draw Entry*

📱 *Phone:* ${phoneNumber}
📋 *Entry Type:* ${type === "store" ? "Store Review" : "Book Review"}

—
Entered for ₹499 Books Set Giveaway
    `;

    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: CHAT_ID,
        text: message,
        parse_mode: "Markdown",
      },
      { timeout: 10000 },
    );

    return res.status(200).json({
      success: true,
      message: "Phone number saved for lucky draw!",
    });
  } catch (err) {
    console.error("Error in /phone:", err);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

module.exports = router;
