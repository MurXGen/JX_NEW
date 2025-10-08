const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    planId: { type: String }, // e.g. 'pro'
    amount: { type: Number, required: true }, // stored in smallest currency unit for INR (paise) or in USDT units depending
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
      enum: ["created", "paid", "failed", "captured"],
      default: "created",
    },

    meta: { type: Object, default: {} }, // any extra info
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);
