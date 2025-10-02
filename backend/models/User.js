// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String },

    email: { type: String, required: true, unique: true, index: true },

    password: {
      type: String,
      required: function () {
        // Required only if googleId is NOT present and password is undefined
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
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
