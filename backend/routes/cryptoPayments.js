const express = require("express");
const router = express.Router();
const {
  createCryptoOrder,
  verifyCryptoPayment,
} = require("../controllers/cryptoPaymentsCtrl");

router.post("/create-order", createCryptoOrder);
router.post("/verify-payments", verifyCryptoPayment); // No param, uses cookie

module.exports = router;
