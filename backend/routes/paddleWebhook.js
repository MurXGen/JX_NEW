const express = require("express");
const router = express.Router();
const { paddleWebhook, createOrder } = require("../controllers/paddleCon");

// IMPORTANT: Paddle needs RAW body
router.post(
  "/paddle/webhook",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    try {
      req.body = JSON.parse(req.body.toString());
    } catch {
      req.body = {};
    }
    next();
  },
  paddleWebhook
);

router.post("/create-order", createOrder);

module.exports = router;
