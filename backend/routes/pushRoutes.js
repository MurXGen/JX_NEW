const express = require("express");
const { publicKey, status, subscribe, unsubscribe, sendTest } = require("../controllers/pushController");

const router = express.Router();

router.get("/public-key", publicKey);
router.get("/status", status);
router.post("/subscribe", subscribe);
router.post("/unsubscribe", unsubscribe);
router.post("/test", sendTest);

module.exports = router;
