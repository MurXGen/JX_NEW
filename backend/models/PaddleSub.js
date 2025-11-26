const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    plan: {
      type: String,
      enum: ["free", "pro", "elite", "MASTER001", "PRO001", "trial"],
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
    status: {
      type: String,
      enum: ["active", "expired", "canceled", "trial", "none"],
      default: "active",
    },
    price: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "USD",
    },
    paddleSubscriptionId: String,
    paddleOrderId: String,
    paddleCheckoutId: String,
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: Date,
    billingPeriod: {
      type: String,
      enum: ["monthly", "yearly", "lifetime"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subscription_pad", subscriptionSchema);
