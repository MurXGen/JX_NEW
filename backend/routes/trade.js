const express = require("express");
const multer = require("multer");
const router = express.Router();
// Multer for handling multipart form-data
const storage = multer.memoryStorage();
const upload = multer({ storage });
const {
  addTrade,
  updateTrade,
  tradeChat,
  deleteTrade,
} = require("../controllers/tradeController");

router.post(
  "/addd",
  upload.fields([
    { name: "openImage", maxCount: 1 },
    { name: "closeImage", maxCount: 1 },
  ]),
  addTrade
);

router.put(
  "/update/:id",
  upload.fields([
    { name: "openImage", maxCount: 1 },
    { name: "closeImage", maxCount: 1 },
  ]),
  updateTrade
);

router.delete("/delete", deleteTrade);

router.post("/trade-chat", tradeChat);

module.exports = router;
