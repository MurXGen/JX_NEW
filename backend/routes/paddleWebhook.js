const express = require("express");
const router = express.Router();
const { handlePaddleWebhook } = require("../controllers/paddleCon");

// Paddle requires RAW body for signature verification
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handlePaddleWebhook
);

module.exports = router;
