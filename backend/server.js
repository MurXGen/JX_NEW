const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const cookieParser = require('cookie-parser');
const path = require('path');

// Routes
const tradeRoutes = require('./routes/trade');
const authRoutes = require('./routes/authRoutes');
const accountRoutes = require('./routes/account');

const app = express();

// 🛡 Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// 🌐 Connect to main (user) DB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('✅ MongoDB (User DB) Connected'))
  .catch(err => console.error('❌ MongoDB User DB Connection Error:', err));

// 🛠 Connect to admin DB (separate connection)
const adminDbUri = process.env.ADMIN_DB_URI || 'mongodb://localhost:27017/TradeWings_admin';
const adminDb = mongoose.createConnection(adminDbUri);

adminDb.once('open', () => {
  console.log('✅ MongoDB (Admin DB) Connected');
});
adminDb.on('error', (err) => {
  console.error('❌ MongoDB Admin DB Connection Error:', err);
});

app.set('adminDb', adminDb); // 📌 Make available in routes/controllers

// 🔗 API Routes
app.use('/api/auth', authRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/trades', tradeRoutes);

// 🤖 Telegram Bot Init
require('./telegram');

// 🌍 Fallback for unmatched routes
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// 🚀 Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🌐 Server running on http://localhost:${PORT}`);
});
