// models/PaddleEvent.js
// Every Paddle webhook we receive, keyed by Paddle's event_id. Gives us:
//   - idempotency (Paddle delivers at-least-once; retries repeat event_id)
//   - an audit trail, including events we couldn't match to a user
//   - a queue the reconciler can re-run when processing failed or the user
//     appeared later (e.g. signed up after paying)
const mongoose = require("mongoose");

const PaddleEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    eventType: { type: String, required: true },
    occurredAt: { type: Date },
    // received → processed | ignored | unmatched | error
    status: {
      type: String,
      enum: ["received", "processed", "ignored", "unmatched", "error"],
      default: "received",
      index: true,
    },
    attempts: { type: Number, default: 0 },
    lastError: { type: String },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    note: { type: String },
    payload: { type: Object, default: {} },
  },
  { timestamps: true },
);

module.exports = mongoose.model("PaddleEvent", PaddleEventSchema);
