const mongoose = require("mongoose");

const SubscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    planId: { type: String }, // e.g. 'pro'
    razorpayPlanId: { type: String }, // plan id in Razorpay (if created/used)
    razorpaySubscriptionId: { type: String },
    status: { type: String, default: "created" }, // created | active | cancelled | expired
    paymentMethod: { type: String, default: "upi" },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subscription", SubscriptionSchema);
