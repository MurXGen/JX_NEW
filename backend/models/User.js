// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String },

    email: { type: String, required: true, unique: true, index: true },

    password: {
      type: String,
      required: function () {
        // Required only if googleId is NOT present
        return !this.googleId;
      },
    },

    googleId: { type: String }, // store Google account ID if OAuth signup

    feedback: [
      {
        message: String,
        date: { type: Date, default: Date.now },
      },
    ],

    // --- Email verification fields ---
    isVerified: { type: Boolean, default: false }, // true after OTP verification
    verifiedAt: { type: Date }, // timestamp when verified
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
