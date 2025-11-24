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
      enum: ["free", "pro", "elite", "MASTER001", "PRO001", "trial"],
      default: "pro",
    },
    subscriptionType: {
      type: String,
      enum: [
        "one-time",
        "recurring",
        "none",
        "free-trial",
        "lifetime",
        "trial",
      ],
      default: "one-time",
    },

    subscriptionStartAt: { type: Date },
    subscriptionExpiresAt: { type: Date },
    subscriptionCreatedAt: { type: Date },

    // 🔹 Orders linked to this user
    orders: [
      {
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
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
