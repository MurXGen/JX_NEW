const express = require("express");
const { createOrder } = require("../controllers/thebookxpayment_controller");

const router = express.Router();

router.post("/create-order", createOrder);

module.exports = router;
