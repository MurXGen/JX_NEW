// routes/paddleRoutes.js
const express = require("express");
const router = express.Router();
const { paddleWebhook } = require("../controllers/paddleCon");

router.post("/webhook", paddleWebhook);

module.exports = router;
