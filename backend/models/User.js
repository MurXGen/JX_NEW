const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String },

    email: { type: String, required: true, unique: true, index: true },

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
      default: "none",
    },

    subscriptionType: {
      type: String,
      enum: ["recurring", "one-time", "none", "lifetime"],
      default: "none",
    },

    paddleCustomerId: { type: String },

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
