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

//
// 🔹 Schema Method: Activate Subscription
//
userSchema.methods.activateSubscription = function (order) {
  const now = new Date();

  this.subscriptionPlan = order.planId;
  this.subscriptionStatus = "active";
  this.subscriptionType = order.paymentType || "one-time";
  this.subscriptionStartAt = now;
  this.subscriptionCreatedAt = this.subscriptionCreatedAt || now;

  // Expiry based on period
  const expiry = new Date();
  if (order.period === "lifetime")
    expiry.setFullYear(expiry.getFullYear() + 100);
  else if (order.period === "yearly")
    expiry.setFullYear(expiry.getFullYear() + 1);
  else expiry.setMonth(expiry.getMonth() + 1);

  this.subscriptionExpiresAt = expiry;

  // Push order reference if not already added
  const exists = this.orders.some(
    (o) => o.orderId.toString() === order._id.toString()
  );
  if (!exists) {
    this.orders.push({
      orderId: order._id,
      status: order.status || "paid",
    });
  }
};

//
// 🔹 Pre hook: Auto-expire subscriptions when fetching user
//
userSchema.pre("findOne", async function (next) {
  this._autoCheckExpiry = true; // flag for post hook
  next();
});

userSchema.post("findOne", async function (doc) {
  if (!doc || !doc._autoCheckExpiry) return;

  try {
    if (
      doc.subscriptionExpiresAt &&
      new Date(doc.subscriptionExpiresAt) < new Date() &&
      doc.subscriptionStatus === "active"
    ) {
      // Auto-expire the subscription
      doc.subscriptionStatus = "expired";

      // Optionally also mark last order as expired
      const lastOrder = doc.orders?.[doc.orders.length - 1];
      if (lastOrder && lastOrder.status === "paid") {
        lastOrder.status = "expired";
      }

      await doc.save();
      console.log(`🔁 Auto-expired subscription for user ${doc.email}`);
    }
  } catch (err) {
    console.error("Auto-expiry check failed:", err.message);
  }
});

module.exports = mongoose.model("User", userSchema);
