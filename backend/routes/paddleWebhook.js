const express = require("express");
const router = express.Router();
const { handlePaddleWebhook } = require("../controllers/paddleCon");

// Health/version check — open in a browser to confirm which backend code is
// live: GET https://api.journalx.app/api/pricingpad/health
// If you DON'T see this JSON (you get "Route not found"), the new backend
// hasn't deployed yet.
router.get("/health", (req, res) => {
  res.json({
    ok: true,
    handler: "paddleCon v3 (logging + email fallback)",
    paddleApiKeySet: !!process.env.PADDLE_API_KEY,
    paddleEnvironment: process.env.PADDLE_ENVIRONMENT || "(unset → sandbox)",
    webhookSecretSet: !!process.env.PADDLE_WEBHOOK_SECRET,
    time: new Date().toISOString(),
  });
});

// Paddle requires RAW body for signature verification
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handlePaddleWebhook
);

module.exports = router;
