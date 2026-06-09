const express = require("express");
const multer = require("multer");
const router = express.Router();
const dayjs = require("dayjs");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
// Multer for handling multipart form-data
const storage = multer.memoryStorage();
const upload = multer({ storage });

const {
  addTrade,
  updateTrade,
  tradeChat,
  deleteTrade,
  addTradesBulk,
  addTradeImage,
  deleteTradeImage,
  annotateTrade,
} = require("../controllers/tradeController");

router.post(
  "/addd",
  upload.fields([
    { name: "openImage", maxCount: 1 },
    { name: "closeImage", maxCount: 1 },
    { name: "images", maxCount: 4 }, // v2 log-trade modal screenshots
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

// v2: bulk CSV import (quick-log rows)
router.post("/bulk", express.json({ limit: "2mb" }), addTradesBulk);

// v2: per-trade screenshot CRUD (Backblaze-backed)
router.post("/:id/images", upload.fields([{ name: "image", maxCount: 1 }]), addTradeImage);
router.delete("/:id/images", express.json(), deleteTradeImage);

// v2: chart annotation (mark entry/exit) on an existing trade
router.post("/:id/annotate", express.json(), annotateTrade);

router.post("/trade-chat", tradeChat);

module.exports = router;
