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
    handler: "paddleCon v5 (subscription-aware verify + lifecycle + diagnostics)",
    paddleApiKeySet: !!process.env.PADDLE_API_KEY,
    paddleEnvironment: process.env.PADDLE_ENVIRONMENT || "(unset → sandbox)",
    webhookSecretSet: !!process.env.PADDLE_WEBHOOK_SECRET,
    // surface the configured price IDs (so you can eyeball that the monthly/
    // yearly ones actually match what the checkout uses — the #1 cause of
    // "subscription doesn't activate but lifetime does")
    priceIds: {
      monthly: process.env.PADDLE_MONTHLY_PRICE_ID || "(unset)",
      yearly: process.env.PADDLE_YEARLY_PRICE_ID || "(unset)",
      lifetime: process.env.PADDLE_LIFETIME_PRICE_ID || "(unset)",
    },
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
