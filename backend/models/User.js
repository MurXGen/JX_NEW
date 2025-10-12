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

    // 🔹 Subscription reference
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
    },

    // 🔹 Quick access fields
    subscriptionStatus: {
      type: String,
      enum: ["active", "expired", "canceled", "trial", "none"],
      default: "active",
    },
    subscriptionPlan: {
      type: String,
      enum: ["free", "pro", "elite", "master"],
      default: "pro",
    },
    subscriptionType: {
      type: String,
      enum: ["one-time", "recurring", "none", "free-trial"],
      default: "one-time",
    },

    subscriptionStartAt: { type: Date }, // when the subscription started
    subscriptionExpiresAt: { type: Date }, // when it will expire
    subscriptionCreatedAt: { type: Date }, // optional, first subscription created
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
