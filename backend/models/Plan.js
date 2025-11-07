const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
  {
    // 🔹 Unique Identifier
    planId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // 🔹 Short codes for internal use
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true, // e.g., "FREE", "PRO", "MASTER"
    },

    // 🔹 Display name
    name: {
      type: String,
      required: true,
      trim: true, // e.g., "Pro"
    },

    // 🔹 Slug for URLs or lookups
    slug: {
      type: String,
      required: true,
      lowercase: true, // e.g., "pro", "lifetime"
    },

    // 🔹 Currency preference
    currency: {
      type: String,
      enum: ["auto", "inr", "usd"],
      default: "auto",
    },

    // 💰 Pricing (set 0 for unavailable)
    monthlyPriceINR: { type: Number, default: 0 },
    monthlyPriceUSD: { type: Number, default: 0 },
    yearlyPriceINR: { type: Number, default: 0 },
    yearlyPriceUSD: { type: Number, default: 0 },
    lifetimePriceINR: { type: Number, default: 0 },
    lifetimePriceUSD: { type: Number, default: 0 },

    // 🧩 Features (readable + backend flags)
    features: {
      logTrades: { type: String, default: "" },
      multipleAccounts: { type: String, default: "" },
      showsAds: { type: Boolean, default: true },
      imageUpload: { type: String, default: "" },
      maxImageSize: { type: String, default: "" },
      shareTrades: { type: Boolean, default: true },
      aiAnalysis: { type: Boolean, default: false },
      advancedCharts: { type: Boolean, default: true },
      quickTradeLog: { type: String, default: "" },
      multipleEntries: { type: Boolean, default: true },
      backupData: { type: Boolean, default: false },
      integration: { type: Boolean, default: false },
    },

    // 🧮 Backend Logic Limits
    limits: {
      tradeLimitPerMonth: { type: Number, default: 0 }, // 0 = unlimited
      accountLimit: { type: Number, default: 0 },
      imageLimitPerMonth: { type: Number, default: 0 },
      maxImageSizeMB: { type: Number, default: 0 },
    },

    // ⚙️ Plan Status
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    // 🕓 Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// 🔁 Auto-update `updatedAt` field
planSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Plan", planSchema);
