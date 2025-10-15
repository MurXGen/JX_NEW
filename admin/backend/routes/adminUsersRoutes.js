const express = require("express");
const router = express.Router();
const {
  getAllUsers,
  getUserOrders,
  updateOrder,
} = require("../controller/adminUserCtrl");

// 🔹 Get all users
router.get("/users", getAllUsers);

// 🔹 Get orders for a specific user
router.get("/users/:userId/orders", getUserOrders);

// 🔹 Update order
router.put("/orders/:orderId", updateOrder);

module.exports = router;
