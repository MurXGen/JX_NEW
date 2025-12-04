const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    paddleTransactionId: String,
    paddlePriceId: String,

    planId: String, // free / pro / lifetime
    paymentType: String, // one-time / recurring / lifetime
    period: String, // monthly / yearly / lifetime

    amount: Number,
    currency: String,

    status: {
      type: String,
      enum: ["paid", "pending", "failed", "refunded"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Paddle_Order", orderSchema);
