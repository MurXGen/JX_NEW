const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const passport = require("passport");
require("./utils/passport"); // Passport Google strategy
const path = require("path");

// Routes
const tradeRoutes = require("./routes/trade");
const authRoutes = require("./routes/authRoutes");
const accountRoutes = require("./routes/account");

const app = express();

// 🛡 Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
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

// 🔗 API Routes
app.use("/api/auth", authRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/trades", tradeRoutes);

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
