const express = require("express");
const router = express.Router();
const { paddleWebhookHandler } = require("../controllers/paddleCon");

// Paddle webhooks must be RAW body
router.post(
  "/paddle/webhook",
  express.raw({ type: "application/json" }),
  paddleWebhookHandler
);

module.exports = router;
