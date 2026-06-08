// models/Account.js
const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  name: { type: String, required: true },
  currency: { type: String, default: 'USD' },
  accountType: {
    type: String,
    enum: ['spot', 'futures', 'paper'],
    default: 'spot',
  },

  startingBalance: {
    amount: { type: Number, required: true },
    time: { type: Date, default: Date.now }
  },

  // gamification — XP accrued from logging trades in this journal
  xp: { type: Number, default: 0 },
  xpTrades: { type: Number, default: 0 }, // count of trades that earned XP

}, { timestamps: true });

module.exports = mongoose.model('Account', accountSchema);
