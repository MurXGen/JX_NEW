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

    // User-entered values
    openFeeValue: {
      type: Number,
      default: 0,
      set: (v) => {
        if (v === "null" || v === null || v === "") return 0;
        return Number(v);
      },
    },
    closeFeeValue: {
      type: Number,
      default: 0,
      set: (v) => {
        if (v === "null" || v === null || v === "") return 0;
        return Number(v);
      },
    },

    // Calculated amounts
    openFeeAmount: {
      type: Number,
      default: 0,
      set: (v) => {
        if (v === "null" || v === null || v === "") return 0;
        return Number(v);
      },
    },
    closeFeeAmount: {
      type: Number,
      default: 0,
      set: (v) => {
        if (v === "null" || v === null || v === "") return 0;
        return Number(v);
      },
    },
    feeAmount: {
      type: Number,
      default: 0,
      set: (v) => {
        if (v === "null" || v === null || v === "") return 0;
        return Number(v);
      },
    },

    // After-fee performance
    pnlAfterFee: {
      type: Number,
      default: 0,
      set: (v) => {
        if (v === "null" || v === null || v === "") return 0;
        return Number(v);
      },
    },

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

    // --- Revamp v2 context fields ---
    sizeUnit: { type: String, enum: ["asset", "usd", ""], default: "" }, // how user entered size
    strategy: { type: String, default: "" }, // setup tag (incl. custom)
    marketCondition: { type: String, default: "" }, // trending | ranging | volatile
    timeframe: { type: String, default: "" }, // "1H", "4H" or custom "45m"
    confidence: { type: Number, min: 0, max: 5, default: 0 }, // stars
    emotion: { type: String, default: "" }, // emotion at entry (incl. custom)
    mistakes: [{ type: String }], // self-reported mistakes

    // v2 screenshots — up to 4 per trade (10MB total), stored on Backblaze
    images: [
      {
        url: { type: String },
        sizeKB: { type: Number, default: 0 },
        _id: false,
      },
    ],

    // origin: manual | auto (exchange) | tradingview (webhook)
    source: { type: String, default: "manual" },

    // TradingView marker metadata — lets the details page redraw the
    // entry/exit chart when there are no screenshots
    tvChart: {
      symbol: String,
      exchange: String,
      timeframe: String,
      entryTime: Date,
      exitTime: Date,
      entryPrice: Number,
      exitPrice: Number,
      stopPrice: Number,
      takeProfit: Number,
      _id: false,
    },

    // when the entry/exit were marked on a chart in the details page
    chartAnnotatedAt: { type: Date },

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
