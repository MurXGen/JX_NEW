const express = require("express");
const router = express.Router();
const paymentsCtrl = require("../controllers/paymentsController");

// create order (one-time)
router.post("/create-order", paymentsCtrl.createOrder);

// verify order after client checkout
router.post("/verify-payment", paymentsCtrl.verifyPayment);

// create subscription (recurring)
router.post("/create-subscription", paymentsCtrl.createSubscription);

// verify subscription payment after client checkout
router.post("/verify-subscription", paymentsCtrl.verifySubscription);

// webhook: IMPORTANT - register this route with express.raw() in server.js
router.post("/webhook", paymentsCtrl.webhookHandler);

module.exports = router;
