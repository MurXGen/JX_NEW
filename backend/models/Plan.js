// models/Plan.js
const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
  {
    planId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
    },
    currency: {
      type: String,
      enum: ["auto", "inr", "usd"],
      default: "auto",
    },

    // 💰 NEW PRICING STRUCTURE
    monthly: {
      inr: { type: Number, default: 0 },
      inrusdt: { type: Number, default: 0 }, // For Indian users paying in USDT
      usdt: { type: Number, default: 0 }, // For international users
    },
    yearly: {
      inr: { type: Number, default: 0 },
      inrusdt: { type: Number, default: 0 },
      usdt: { type: Number, default: 0 },
    },
    lifetime: {
      inr: { type: Number, default: 0 },
      inrusdt: { type: Number, default: 0 },
      usdt: { type: Number, default: 0 },
    },

    // 🧩 Features
    features: {
      logTrades: { type: String, default: "" },
      multipleAccounts: { type: String, default: "" },
      showsAds: { type: Boolean, default: true },
      imageUpload: { type: String, default: "" },
      maxImageSize: { type: String, default: "" },
      shareTrades: { type: Boolean, default: false }, // Only Master can share
      aiAnalysis: { type: Boolean, default: false },
      advancedCharts: { type: Boolean, default: true },
      quickTradeLog: { type: String, default: "" },
      multipleEntries: { type: Boolean, default: true },
      backupData: { type: Boolean, default: false },
      integration: { type: Boolean, default: false },
      exportTrades: { type: Boolean, default: false }, // Pro & Master can export
    },

    // 🧮 Backend Logic Limits
    limits: {
      tradeLimitPerMonth: { type: Number, default: 0 },
      quickTradeLimitPerMonth: { type: Number, default: 0 },
      accountLimit: { type: Number, default: 0 },
      imageLimitPerMonth: { type: Number, default: 0 },
      maxImageSizeMB: { type: Number, default: 0 },
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

planSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Plan", planSchema);
