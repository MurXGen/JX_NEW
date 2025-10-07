const mongoose = require("mongoose");

const PlanSchema = new mongoose.Schema({
  planId: { type: String, required: true, unique: true }, // e.g., "pro", "elite", "master"
  name: { type: String, required: true },
  monthly: {
    inr: { type: Number, required: true },
    inrUsdt: { type: Number, required: true },
    usdt: { type: Number, required: true },
  },
  yearly: {
    inr: { type: Number, required: true },
    inrUsdt: { type: Number, required: true },
    usdt: { type: Number, required: true },
  },
  icon: { type: String }, // optional, can store icon name or url
});

module.exports = mongoose.model("Plan", PlanSchema);
