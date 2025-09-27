// models/Trade.js
const mongoose = require("mongoose");

const tradeSchema = new mongoose.Schema(
  {
    // References
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },

    // Core trade details
    symbol: { type: String, required: true, index: true },
    direction: { type: String, enum: ["long", "short"], required: true },
    quantityUSD: { type: Number, required: true },
    leverage: { type: Number, required: true },
    totalQuantity: { type: Number, required: true }, // quantityUSD × leverage
    tradeStatus: {
      type: String,
      enum: ["running", "closed", "quick"],
      default: "running",
    },

    // Entries & exits (disable _id for subdocs)
    entries: [
      {
        price: { type: Number, default: 0 },
        allocation: { type: Number, default: 100 },
        quantity: { type: Number, default: 0 },
        _id: false,
      },
    ],

    exits: [
      {
        mode: { type: String, enum: ["price", "percent"], default: "price" },
        price: { type: Number, default: 0 },
        percent: { type: Number, default: 0 },
        allocation: { type: Number, default: 0 },
        quantity: { type: Number, default: 0 },
        _id: false,
      },
    ],

    // SLs
    sls: [
      {
        mode: { type: String, enum: ["price", "percent"], default: "price" },
        price: { type: Number, default: 0 },
        percent: { type: Number, default: 0 },
        allocation: { type: Number, default: 0 },
        quantity: { type: Number, default: 0 },
        _id: false,
      },
    ],

    // TPs
    tps: [
      {
        mode: { type: String, enum: ["price", "percent"], default: "price" },
        price: { type: Number, default: 0 },
        percent: { type: Number, default: 0 },
        allocation: { type: Number, default: 0 },
        quantity: { type: Number, default: 0 },
        _id: false,
      },
    ],

    // Fee fields
    feeType: {
      type: String,
      enum: ["percent", "currency", ""],
      default: "",
    },
    feeValue: { type: Number, default: 0 },
    feeAmount: { type: Number, default: 0 },
    pnlAfterFee: { type: Number, default: 0 },

    // Open/close info
    openTime: { type: Date, default: Date.now, index: true },
    closeTime: Date,
    duration: { type: Number, default: 0 }, // hours

    // Images (store URL only; actual file in S3/Backblaze)
    openImageUrl: { type: String },
    closeImageUrl: { type: String },

    openImageSizeKB: { type: Number }, // ✅ store size in KB
    closeImageSizeKB: { type: Number }, // ✅ store size in KB

    // Analysis & rules
    rulesFollowed: { type: Boolean, default: false },
    reason: [{ type: String }], // array of strings
    learnings: { type: String, default: "" },

    // Calculations
    rr: { type: String, default: "" },
    pnl: { type: Number, default: 0 },
    expectedProfit: { type: Number, default: 0 },
    expectedLoss: { type: Number, default: 0 },
    avgEntryPrice: { type: Number, default: 0 },
    avgExitPrice: { type: Number, default: 0 },
    avgTPPrice: { type: Number, default: 0 },
    avgSLPrice: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Trade", tradeSchema);
