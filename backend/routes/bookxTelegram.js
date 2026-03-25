const express = require("express");
const router = express.Router();
const axios = require("axios");

// POST /api/telegram/review
router.post("/review", async (req, res) => {
  try {
    const { bookId, review } = req.body;

    if (!bookId || !review) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const message = `
📚 New Book Review

Book ID: ${bookId}
Review:
${review}
    `;

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: CHAT_ID,
        text: message,
      },
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Telegram error" });
  }
});

module.exports = router;
