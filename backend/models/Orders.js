// models/Order.js
const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    planId: { type: String, required: true }, // 'pro', 'master'
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    method: {
      type: String,
      enum: ["upi", "card", "netbanking", "crypto"],
      default: "upi",
    },

    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },

    status: {
      type: String,
      enum: ["created", "paid", "failed", "captured", "pending"],
      default: "created",
    },
    period: {
      type: String,
      enum: ["monthly", "yearly", "lifetime"],
      required: true,
    },

    paymentType: {
      type: String,
      enum: ["one-time", "recurring", "lifetime"],
      default: "one-time",
    },

    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);
