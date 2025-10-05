// models/Subscription.js
const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ["free", "pro", "elite", "master"],
      default: "free",
    },
    paymentMethod: {
      type: String,
      enum: ["razorpay", "crypto"],
      required: true,
    },
    price: { type: Number, required: true },
    currency: { type: String, default: "INR" }, // or USDT
    isRecurring: { type: Boolean, default: false },
    startedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date }, // end of plan / trial
    status: {
      type: String,
      enum: ["active", "expired", "canceled", "pending"],
      default: "pending",
    },
    transactionId: { type: String }, // Razorpay / Crypto tx id
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);
