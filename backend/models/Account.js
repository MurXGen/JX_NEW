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
  

}, { timestamps: true });

module.exports = mongoose.model('Account', accountSchema);
