const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
    },
    plan: {
      type: String,
      enum: [
        "free",
        "pro",
        "elite",
        "lifetime",
        "MASTER001",
        "PRO001",
        "trial",
      ],
      required: true,
    },
    type: {
      type: String,
      enum: [
        "one-time",
        "recurring",
        "none",
        "free-trial",
        "lifetime",
        "trial",
      ],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      default: 0,
    },
    currency: {
      type: String,
      default: "USD",
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "expired"],
      default: "pending",
    },
    paddleOrderId: String,
    paddleCheckoutId: String,
    paddleSubscriptionId: String,
    billingPeriod: {
      type: String,
      enum: ["monthly", "yearly", "lifetime"],
    },
    country: String,
    paymentMethod: String,
    receiptUrl: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order_pad", orderSchema);
