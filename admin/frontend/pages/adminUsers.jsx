// components/Admin/AdminUsers.js
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  Edit,
  Save,
  X,
  User,
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  MoreVertical,
  ChevronDown,
  Download,
} from "lucide-react";
import axios from "axios";

const API_BASE = "http://localhost:8000/api";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [orderForm, setOrderForm] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("users");

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE}/admin/users`);
        setUsers(res.data.users);
      } catch (err) {
        console.error("Failed to fetch users:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // Fetch orders when user is selected
  const handleUserClick = async (userId) => {
    const user = users.find((u) => u._id === userId);
    setSelectedUser(user);
    setActiveTab("orders");

    try {
      const res = await axios.get(`${API_BASE}/admin/users/${userId}/orders`);
      setOrders(res.data.orders);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      setOrders([]);
    }
  };

  // Handle form change
  const handleChange = (e) => {
    setOrderForm({ ...orderForm, [e.target.name]: e.target.value });
  };

  // Start editing an order
  const handleEdit = (order) => {
    setEditingOrderId(order._id);
    setOrderForm({
      amount: order.amount / 100, // Convert from paise to rupees
      status: order.status,
      period: order.period,
      method: order.method,
    });
  };

  // Save edited order
  const handleSave = async (orderId) => {
    try {
      const payload = {
        ...orderForm,
        amount: orderForm.amount * 100, // Convert back to paise
      };

      const res = await axios.put(
        `${API_BASE}/admin/orders/${orderId}`,
        payload
      );

      setEditingOrderId(null);
      handleUserClick(selectedUser._id); // Refresh orders
    } catch (err) {
      console.error("Failed to update order:", err);
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setEditingOrderId(null);
    setOrderForm({});
  };

  // Filter users based on search
  const filteredUsers = users.filter(
    (user) =>
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter orders based on status
  const filteredOrders = orders.filter(
    (order) => statusFilter === "all" || order.status === statusFilter
  );

  // Get status badge color and icon
  const getStatusConfig = (status) => {
    switch (status) {
      case "paid":
        return { color: "success", icon: CheckCircle, label: "Paid" };
      case "pending":
        return { color: "warning", icon: Clock, label: "Pending" };
      case "failed":
        return { color: "error", icon: AlertCircle, label: "Failed" };
      default:
        return { color: "neutral", icon: Clock, label: status };
    }
  };

  // Format currency for INR and USDT
  const formatCurrency = (amount, currency = "INR") => {
    if (currency === "INR") {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount / 100); // Convert paise → rupees
    } else if (currency === "USDT") {
      // For USDT, just format as number + append USDT
      return `${amount.toFixed(2)} USDT`;
    } else {
      // Fallback for other currencies
      return amount;
    }
  };

  return (
    <div className="admin-panel">
      {/* Header */}
      <div className="admin-header">
        <div className="header-content">
          <h1 className="admin-title">Admin Dashboard</h1>
          <p className="admin-subtitle">Manage users and their subscriptions</p>
        </div>
        <div className="header-actions">
          <button className="export-button">
            <Download size={16} />
            Export Data
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="admin-tabs">
        <button
          className={`tab-button ${activeTab === "users" ? "active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          <User size={16} />
          Users ({users.length})
        </button>
        <button
          className={`tab-button ${activeTab === "orders" ? "active" : ""}`}
          onClick={() => setActiveTab("orders")}
          disabled={!selectedUser}
        >
          <CreditCard size={16} />
          Orders ({selectedUser ? orders.length : 0})
        </button>
      </div>

      {/* Main Content */}
      <div className="admin-content">
        <AnimatePresence mode="wait">
          {activeTab === "users" && (
            <motion.div
              key="users"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="users-section"
            >
              {/* Search and Filters */}
              <div className="section-header">
                <div className="search-box">
                  <Search size={18} />
                  <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
                <div className="filter-group">
                  <Filter size={16} />
                  <span>
                    Showing {filteredUsers.length} of {users.length} users
                  </span>
                </div>
              </div>

              {/* Users List */}
              <div className="users-grid">
                {loading ? (
                  <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <span>Loading users...</span>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="empty-state">
                    <User size={48} />
                    <h3>No users found</h3>
                    <p>Try adjusting your search criteria</p>
                  </div>
                ) : (
                  filteredUsers.map((user, index) => (
                    <motion.div
                      key={user._id}
                      className={`user-card ${
                        selectedUser?._id === user._id ? "selected" : ""
                      }`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleUserClick(user._id)}
                    >
                      <div className="user-avatar">
                        <User size={20} />
                      </div>
                      <div className="user-info">
                        <h4 className="user-name">
                          {user.name || "Unknown User"}
                        </h4>
                        <p className="user-email">{user.email}</p>
                        <div className="user-meta">
                          <span className="user-id">
                            ID: {user._id.slice(-8)}
                          </span>
                          <span className="user-join">
                            Joined{" "}
                            {new Date(user.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="user-actions">
                        <ChevronDown size={16} />
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "orders" && selectedUser && (
            <motion.div
              key="orders"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="orders-section"
            >
              {/* User Header */}
              <div className="user-header">
                <div className="user-display">
                  <div className="user-avatar large">
                    <User size={24} />
                  </div>
                  <div>
                    <h3>{selectedUser.name}</h3>
                    <p>{selectedUser.email}</p>
                  </div>
                </div>
                <button
                  className="back-button"
                  onClick={() => setActiveTab("users")}
                >
                  ← Back to Users
                </button>
              </div>

              {/* Orders Filter */}
              <div className="orders-filter">
                <div className="filter-tabs">
                  {["all", "paid", "pending", "failed"].map((status) => (
                    <button
                      key={status}
                      className={`filter-tab ${
                        statusFilter === status ? "active" : ""
                      }`}
                      onClick={() => setStatusFilter(status)}
                    >
                      {status === "all"
                        ? "All Orders"
                        : getStatusConfig(status).label}
                      {status !== "all" && (
                        <span className="count-badge">
                          {orders.filter((o) => o.status === status).length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Orders List */}
              <div className="orders-table">
                <div className="table-header">
                  <div className="col">Order ID</div>
                  <div className="col">Plan</div>
                  <div className="col">Amount</div>
                  <div className="col">Period</div>
                  <div className="col">Method</div>
                  <div className="col">Status</div>
                  <div className="col">Date</div>
                  <div className="col">Actions</div>
                </div>

                <div className="table-body">
                  {filteredOrders.length === 0 ? (
                    <div className="empty-orders">
                      <CreditCard size={48} />
                      <h4>No orders found</h4>
                      <p>No orders match the current filter</p>
                    </div>
                  ) : (
                    filteredOrders.map((order) => {
                      const StatusIcon = getStatusConfig(order.status).icon;
                      const statusColor = getStatusConfig(order.status).color;

                      return (
                        <motion.div
                          key={order._id}
                          className="table-row"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          <div className="col order-id">
                            {order.razorpayOrderId ||
                              order.cryptoPaymentId ||
                              order._id.slice(-8)}
                          </div>
                          <div className="col plan-name">
                            {order.meta?.planName || order.planId}
                          </div>
                          <div className="col amount">
                            {formatCurrency(order.amount, order.currency)}
                          </div>
                          <div className="col period">
                            <span className="period-badge">{order.period}</span>
                          </div>
                          <div className="col method">
                            <span className="method-badge">{order.method}</span>
                          </div>
                          <div className="col status">
                            <div className={`status-badge ${statusColor}`}>
                              <StatusIcon size={14} />
                              {getStatusConfig(order.status).label}
                            </div>
                          </div>
                          <div className="col date">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </div>
                          <div className="col actions">
                            {editingOrderId === order._id ? (
                              <div className="edit-actions">
                                <button
                                  className="save-btn"
                                  onClick={() => handleSave(order._id)}
                                >
                                  <Save size={14} />
                                </button>
                                <button
                                  className="cancel-btn"
                                  onClick={handleCancel}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <button
                                className="edit-btn"
                                onClick={() => handleEdit(order)}
                              >
                                <Edit size={14} />
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Edit Modal */}
              <AnimatePresence>
                {editingOrderId && (
                  <motion.div
                    className="edit-modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <motion.div
                      className="edit-modal"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                    >
                      <div className="modal-header">
                        <h3>Edit Order</h3>
                        <button onClick={handleCancel} className="close-btn">
                          <X size={20} />
                        </button>
                      </div>
                      <div className="modal-content">
                        <div className="form-group">
                          <label>Amount (₹)</label>
                          <input
                            type="number"
                            name="amount"
                            value={orderForm.amount}
                            onChange={handleChange}
                            className="form-input"
                          />
                        </div>
                        <div className="form-group">
                          <label>Status</label>
                          <select
                            name="status"
                            value={orderForm.status}
                            onChange={handleChange}
                            className="form-select"
                          >
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="failed">Failed</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Period</label>
                          <select
                            name="period"
                            value={orderForm.period}
                            onChange={handleChange}
                            className="form-select"
                          >
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Method</label>
                          <select
                            name="method"
                            value={orderForm.method}
                            onChange={handleChange}
                            className="form-select"
                          >
                            <option value="upi">UPI</option>
                            <option value="crypto">Crypto</option>
                            <option value="card">Card</option>
                          </select>
                        </div>
                      </div>
                      <div className="modal-actions">
                        <button
                          onClick={handleCancel}
                          className="btn-secondary"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSave(editingOrderId)}
                          className="btn-primary"
                        >
                          Save Changes
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
