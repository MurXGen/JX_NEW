const User = require("../model/User");
const Order = require("../model/Orders");
const mongoose = require("mongoose");

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find(
      {},
      "name email subscriptionStatus subscriptionPlan"
    );
    res.json({ success: true, users });
  } catch (err) {
    error("🔥 getAllUsers Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getUserOrders = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      warn("⚠️ Invalid userId:", userId);
      return res
        .status(400)
        .json({ success: false, message: "Invalid userId" });
    }

    const orders = await Order.find({
      userId: new mongoose.Types.ObjectId(userId),
    }).populate("userId", "name email");

    orders.forEach((o) => log(o));

    res.json({ success: true, orders });
  } catch (err) {
    error("🔥 getUserOrders Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update order details
exports.updateOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { amount, status, period, method, currency, meta } = req.body;

    const order = await Order.findById(orderId);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    if (amount !== undefined) order.amount = amount;
    if (status) order.status = status;
    if (period) order.period = period;
    if (method) order.method = method;
    if (currency) order.currency = currency;
    if (meta) order.meta = meta;

    await order.save();

    res.json({ success: true, message: "Order updated successfully", order });
  } catch (err) {
    error("🔥 updateOrder Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
