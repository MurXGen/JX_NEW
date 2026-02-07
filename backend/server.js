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
const thebookxpayments = require("./routes/thebookxpayments");

// Rate limiter
const createLimiter = require("./utils/rateLimiter");

const app = express();

/* =======================
   ✅ CORS CONFIG
======================= */

const allowedOrigins = [
  "http://localhost:3000",
  "https://thebookx.in",
  "https://www.thebookx.in",
  process.env.CLIENT_URL,
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // allow Postman/curl
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-trade-id"],
  }),
);

// ✅ Handle preflight OPTIONS
app.options("*", cors());

/* =======================
   BODY PARSER
======================= */

app.use((req, res, next) => {
  if (req.originalUrl.startsWith("/api/paddle")) {
    next(); // raw body for paddle webhook
  } else {
    express.json()(req, res, next);
  }
});

app.use(cookieParser());

/* =======================
   PASSPORT
======================= */

app.use(passport.initialize());

/* =======================
   DATABASE
======================= */

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

/* =======================
   ROUTES
======================= */

app.use("/api/auth", createLimiter(40), authRoutes);
app.use("/api/account", createLimiter(20), accountRoutes);
app.use("/api/trades", createLimiter(40), tradeRoutes);

app.use(
  "/api/payments/webhook",
  createLimiter(20),
  express.raw({ type: "application/json" }),
  paymentsRoutes,
);

app.use("/api/payments", createLimiter(20), paymentsRoutes);

app.use("/api/crypto-payments", createLimiter(20), cryptoPaymentsRoutes);
app.use("/api/telegram", createLimiter(20), telegramRoutes);

app.use(
  "/api/pricingpad",
  express.raw({ type: "application/json" }),
  paddleRoute,
);

// ✅ TheBookX Payments
app.use("/api/thebooks/payments", thebookxpayments);

/* =======================
   TELEGRAM BOT
======================= */

require("./telegram");

/* =======================
   FALLBACK
======================= */

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

/* =======================
   START SERVER
======================= */

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🌐 Server running on http://localhost:${PORT}`);
});
