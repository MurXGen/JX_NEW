const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String },

    email: { type: String, required: true, unique: true, index: true },

    // v2 profile
    avatarUrl: { type: String, default: "" },
    avatarSizeKB: { type: Number, default: 0 },
    baseCurrency: { type: String, default: "USD" },

    // TradingView webhook integration — per-user secret token
    tvWebhookToken: { type: String, index: true },

    password: {
      type: String,
      required: function () {
        return !this.googleId;
      },
    },

    googleId: { type: String },

    feedback: [
      {
        message: String,
        date: { type: Date, default: Date.now },
      },
    ],

    isVerified: { type: Boolean, default: false },
    verifiedAt: { type: Date },

    //------------------------------------------------------------------
    // 📣 Acquisition — where the user heard about JournalX (onboarding ask)
    //------------------------------------------------------------------
    acquisition: {
      source: { type: String, default: "" }, // e.g. instagram | youtube | x | google | friend | other
      detail: { type: String, default: "" }, // free text when "other"
      at: { type: Date },
    },

    //------------------------------------------------------------------
    // ✉️ Lifecycle / onboarding emails
    //   emailOptOut → user unsubscribed from non-essential emails
    //   lifecycle.*At → timestamp each onboarding email was sent (dedupe)
    //------------------------------------------------------------------
    emailOptOut: { type: Boolean, default: false },
    lifecycle: {
      welcomeAt: { type: Date },
      day1At: { type: Date },
      day3At: { type: Date },
      day7At: { type: Date },
    },

    //------------------------------------------------------------------
    // 🔥 Subscription System
    //------------------------------------------------------------------

    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
    },

    subscriptionPlan: {
      type: String,
      enum: ["free", "pro", "lifetime"],
      default: "free",
    },

    subscriptionStatus: {
      type: String,
      enum: ["active", "expired", "canceled", "none"],
      default: "active",
    },

    subscriptionType: {
      type: String,
      enum: ["recurring", "one-time", "none", "lifetime", "trial"],
      default: "none",
    },

    // one-time 7-day Pro trial guard
    trialUsed: { type: Boolean, default: false },

    paddleCustomerId: { type: String },

    // where the active subscription was purchased (web Paddle, app Play, crypto)
    subscriptionSource: {
      type: String,
      enum: ["paddle", "play", "crypto", "none"],
      default: "none",
    },

    lastBillingDate: { type: Date },
    nextBillingDate: { type: Date },

    subscriptionStartAt: { type: Date },
    subscriptionExpiresAt: { type: Date },
    subscriptionCreatedAt: { type: Date },

    //------------------------------------------------------------------
    // Paddle/Crypto Orders
    //------------------------------------------------------------------
    orders: [
      {
        orderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "PaddleOrder",
        },
        status: {
          type: String,
          enum: ["pending", "paid", "failed", "expired"],
          default: "pending",
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
