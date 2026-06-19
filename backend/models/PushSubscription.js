const mongoose = require("mongoose");

/* A browser push subscription (one per device/browser). Tied to a user so we
   can target reminders and clean up on unsubscribe / expiry. */
const PushSubscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: { type: String },
    // honor the per-user opt-in; lets us disable without deleting the sub
    enabled: { type: Boolean, default: true },
    lastSentAt: { type: Date },
  },
  { timestamps: true },
);

module.exports =
  mongoose.models.PushSubscription ||
  mongoose.model("PushSubscription", PushSubscriptionSchema);
