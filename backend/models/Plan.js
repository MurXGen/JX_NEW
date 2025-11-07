const mongoose = require("mongoose");

const priceSchema = new mongoose.Schema(
  {
    inr: { type: Number, required: true }, // Price in INR
    inrUsdt: { type: Number, required: true }, // Converted INR to USDT (for info)
    usdt: { type: Number, required: true }, // Direct crypto price
  },
  { _id: false } // prevent creating separate _id for nested objects
);

const PlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true }, // "Pro", "Elite", etc.
    code: { type: String, required: true, unique: true }, // e.g. "pro", "elite", "master"

    monthly: { type: priceSchema, required: true },
    yearly: { type: priceSchema, required: true },

    features: [{ type: String }], // array of key benefits
    isActive: { type: Boolean, default: true }, // toggle plan visibility
  },
  { timestamps: true }
);

module.exports = mongoose.model("Plan", PlanSchema);
