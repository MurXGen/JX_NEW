const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const passport = require("passport");
require("./utils/passport"); // Passport Google strategy

// Routes
const tradeRoutes = require("./routes/trade");
const authRoutes = require("./routes/authRoutes");
const accountRoutes = require("./routes/account");
const paymentsRoutes = require("./routes/payments");
const cryptoPaymentsRoutes = require("./routes/cryptoPayments");
const telegramRoutes = require("./routes/telegramRoutes");
const paddleRoute = require("./routes/paddleWebhook");

// Rate limiter
const createLimiter = require("./utils/rateLimiter");

const app = express();

// 🛡 Middleware
app.use(
  cors({
    origin: [process.env.CLIENT_URL, "http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "x-trade-id"],
  })
);

app.use(express.json());
app.use(cookieParser());

// ⚡ Initialize Passport (no session required)
app.use(passport.initialize());

// 🌐 Connect to main (user) DB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB (User DB) Connected"))
  .catch((err) => console.error("❌ MongoDB User DB Connection Error:", err));

// 🔗 Apply rate limiter to each route separately

app.use("/api/auth", createLimiter(40), authRoutes);
app.use("/api/account", createLimiter(20), accountRoutes);
app.use("/api/trades", createLimiter(20), tradeRoutes);
app.use(
  "/api/payments/webhook",
  createLimiter(20),
  express.raw({ type: "application/json" }),
  paymentsRoutes
);
app.use("/api/payments", createLimiter(20), express.json(), paymentsRoutes);
app.use("/api/crypto-payments", createLimiter(20), cryptoPaymentsRoutes);
app.use("/api/telegram", createLimiter(20), telegramRoutes);
app.use("/api/paddle", createLimiter(40), paddleRoute);

// 🤖 Telegram Bot Init
require("./telegram");

// 🌍 Fallback for unmatched routes
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// 🚀 Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🌐 Server running on http://localhost:${PORT}`);
});
