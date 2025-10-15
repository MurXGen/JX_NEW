const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config(); // <-- load .env variables

const planRoutes = require("./routes/planRoutes");
const adminUsersRoutes = require("./routes/adminUsersRoutes");

const app = express();
app.use(cors({ origin: "http://localhost:3001" }));
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Optional: Listen to connection events
mongoose.connection.on("connected", () =>
  console.log("Mongoose connected to DB")
);
mongoose.connection.on("error", (err) =>
  console.error("Mongoose connection error:", err)
);
mongoose.connection.on("disconnected", () =>
  console.log("Mongoose disconnected")
);

// Routes
app.use("/api/plans", planRoutes);
app.use("/api/admin", adminUsersRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
