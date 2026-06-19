const express = require("express");
const { publicKey, subscribe, unsubscribe, sendTest } = require("../controllers/pushController");

const router = express.Router();

router.get("/public-key", publicKey);
router.post("/subscribe", subscribe);
router.post("/unsubscribe", unsubscribe);
router.post("/test", sendTest);

module.exports = router;
