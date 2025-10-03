// models/EmailVerification.js
const mongoose = require("mongoose");

const emailVerificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    otpHash: { type: String, required: true }, // store hashed OTP
    expiresAt: { type: Date, required: true, index: true },
    attempts: { type: Number, default: 0 }, // limit attempts
    resendCount: {
      type: Number,
      default: 0,
    },
    nextResendAllowedAt: { type: Date }, // throttle resends
  },
  { timestamps: true }
);

module.exports = mongoose.model("EmailVerification", emailVerificationSchema);
