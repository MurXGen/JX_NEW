// models/Orders.js
const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    planId: { type: String, required: true }, // 'pro' or 'master'
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    method: {
      type: String,
      enum: ["upi", "card", "netbanking", "crypto"],
      default: "upi",
    },
    period: {
      type: String,
      enum: ["monthly", "yearly", "lifetime"], // ADDED LIFETIME
      required: true,
    },
    paymentType: {
      type: String,
      enum: ["one-time", "recurring", "lifetime"], // ADDED LIFETIME
      default: "one-time",
    },

    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },

    status: {
      type: String,
      enum: ["created", "paid", "failed", "captured", "pending"],
      default: "created",
    },

    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);
