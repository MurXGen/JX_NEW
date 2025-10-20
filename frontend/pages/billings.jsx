// components/Billing/BillingPage.js
"use client";

import FullPageLoader from "@/components/ui/FullPageLoader";
import { getFromIndexedDB } from "@/utils/indexedDB";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Coins,
  CreditCard,
  Crown,
  Rocket,
  Sparkles,
  XCircle,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function BillingPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewMode, setViewMode] = useState("list"); // "list" or "details"

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      const userData = await getFromIndexedDB("user-data");
      if (userData) {
        setOrders(userData.orders || []);
        setSubscription(userData.subscription || null);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "paid":
        return <CheckCircle size={16} className="success" />;
      case "failed":
        return <XCircle size={16} className="error" />;
      default:
        return <Clock size={16} className="vector" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "paid":
        return "success";
      case "failed":
        return "error";
      default:
        return "vector";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "paid":
        return "Completed";
      case "failed":
        return "Failed";
      case "pending":
        return "Processing";
      case "created":
        return "Initiated";
      default:
        return status || "Unknown";
    }
  };

  const getPlanIcon = (planId) => {
    switch (planId) {
      case "pro":
        return <Crown size={20} className="vector" />;
      case "elite":
        return <Sparkles size={20} className="vector" />;
      case "master":
        return <Rocket size={20} className="vector" />;
      default:
        return <Zap size={20} className="vector" />;
    }
  };

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case "upi":
        return <CreditCard size={16} />;
      case "crypto":
        return <Coins size={16} />;
      default:
        return <CreditCard size={16} />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatAmount = (order) => {
    if (!order || !order.amount) return "0"; // ✅ Prevent undefined

    if (order.currency === "INR") {
      return `₹${(order.amount / 100).toLocaleString()}`;
    } else {
      return `${order.amount} ${order.currency || ""}`;
    }
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return formatDate(dateString);
  };

  if (loading) {
    return <FullPageLoader />;
  }

  const handleBackClick = () => {
    router.push("/profile");
  };

  return (
    <div className="flexClm gap_32">
      {/* Header */}
      <motion.div
        className="flexClm gap_24"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flexRow gap_12">
          <button className="button_sec flexRow" onClick={handleBackClick}>
            <ArrowLeft size={20} />
          </button>
          <div className="flexClm">
            <span className="font_20">Billing & Orders</span>
            <span className="font_12">
              Manage your subscriptions and payment history
            </span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flexRow flexRow_stretch gap_12">
          <div className="boxBg width100 flexClm flex_center">
            <div className="stat-value font_20 font_weight_700">
              {orders.length}
            </div>
            <div className="stat-label font_12">Total Orders</div>
          </div>
          <div className="boxBg width100 flexClm flex_center">
            <div className="stat-value font_20 font_weight_700 success">
              {orders.filter((o) => o.status === "paid").length}
            </div>
            <div className="stat-label font_12">Completed</div>
          </div>
          <div className="boxBg width100 flexClm flex_center">
            <div className="stat-value font_20 font_weight_700">
              {formatAmount(
                orders.reduce(
                  (max, order) => (order.amount > max.amount ? order : max),
                  orders[0] || { amount: 0, currency: "INR" } // ✅ default object
                )
              )}
            </div>
            <div className="stat-label font_12">Largest Order</div>
          </div>
        </div>
      </motion.div>

      {/* Current Subscription */}
      {subscription && (
        <motion.div
          className="chart_boxBg flexClm gap_24"
          style={{ padding: "20px" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="subscription-header order-header">
            <div className="flexRow gap_12">
              {getPlanIcon(subscription.planId)}
              <div className="flexClm">
                <span className="font_16 font_weight_600">Current Plan</span>
                <span className="font_12 success">Active</span>
              </div>
            </div>
            <div className="subscription-badge success">
              {subscription.planId?.toUpperCase()}
            </div>
          </div>

          <div className="flexRow flexRow_stretch gap_12">
            <div className="flexRow gap_12">
              <Calendar size={16} className="vector" />
              <div className="flexClm gap_4">
                <span className="font_12">Started</span>
                <span className="font_14 font_weight_600">
                  {formatDate(subscription.startAt)}
                </span>
              </div>
            </div>
            <div
              className="flexRow gap_12"
              style={{
                textAlign: "right",
                justifyContent: "end",
                flexDirection: "row-reverse",
              }}
            >
              <Clock size={16} className="vector" />
              <div className="flexClm gap_4">
                <span className="font_12">Renews</span>
                <span className="font_14 font_weight_600">
                  {formatDate(subscription.expiresAt)}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <hr width={100} color="grey" />

      {/* Order History */}
      <motion.div
        className="flexClm gap_24"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <div className="section-header flexRow flexRow_stretch">
          <span className="flexRow gap_4 font_16">Order History</span>
          <span className="font_12" style={{ color: "var(--white-50)" }}>
            {orders.length} orders
          </span>
        </div>

        <AnimatePresence>
          {orders.length === 0 ? (
            <motion.div
              className="boxBg notFound"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              <AlertCircle size={48} className="vector" />
              <div className="flexClm gap_12">
                <span className="font_16 font_weight_600">No orders yet</span>
                <span className="font_12 shade_50">
                  Your order history will appear here
                </span>
              </div>
            </motion.div>
          ) : (
            <div className="orders-list flexClm gap_12">
              {orders
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .map((order, index) => (
                  <motion.div
                    key={order._id}
                    className="boxBg flexClm gap_12"
                    style={{ background: "var(--white-4)" }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    whileHover={{ y: -2 }}
                  >
                    {/* Order Header */}
                    <div className="order-header">
                      <div className="order-main">
                        <div className="flexRow gap_12">
                          {getPlanIcon(order.planId)}
                          <div className="flexClm">
                            <span className="font_16 font_weight_600">
                              {order.meta?.planName || order.planId}
                            </span>
                            <span
                              className="font_12"
                              style={{ color: "var(--white-50)" }}
                            >
                              {order.period === "yearly" ? "Yearly" : "Monthly"}{" "}
                              • {getTimeAgo(order.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="order-amount">
                        <span className="font_18 font_weight_700">
                          {formatAmount(order)}
                        </span>
                      </div>
                    </div>

                    {/* Order Details */}
                    <div
                      className="flexRow flexRow_stretch boxBg"
                      style={{ background: "var(--white-4)" }}
                    >
                      <div className="flexRow gap_4 flex_center">
                        {getPaymentMethodIcon(order.method)}
                        <span className="font_12">
                          {order.method?.toUpperCase()}
                        </span>
                      </div>

                      <div className="flexRow gap_4 flex_center">
                        {getStatusIcon(order.status)}
                        <span
                          className={`font_12 font_weight_600 ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {getStatusText(order.status)}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flexRow flexRow_stretch gap_12">
                      <div className="flexRow gap_4 flex_center shade_50">
                        <Calendar size={14} />
                        <span className="font_12">
                          {formatDate(order.createdAt)}
                        </span>
                      </div>
                      {/* <div className="flexRow gap_12">
                        <button
                          className="button_ter flexRow gap_4"
                          onClick={() => {
                            setSelectedOrder(order);
                            setViewMode("details");
                          }}
                        >
                          <Eye size={14} />
                          <span className="font_12">View Details</span>
                        </button>

                        {order.status === "paid" && (
                          <button className="button_ter flexRow gap_4">
                            <Download size={14} />
                            <span className="font_12">Receipt</span>
                          </button>
                        )}
                      </div> */}
                    </div>
                  </motion.div>
                ))}
            </div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Order Details Modal */}
      {/* <AnimatePresence>
        {viewMode === "details" && selectedOrder && (
          <motion.div
            className="cm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setViewMode("list")}
          >
            <motion.div
              className="chart_boxBg"
              style={{ padding: "24px", margin: "12px" }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <span className="font_18 font_weight_600">Order Details</span>
                <button
                  className="close-button"
                  onClick={() => setViewMode("list")}
                >
                  ×
                </button>
              </div>

              <div className="order-detail-content">

                <div className="detail-section">
                  <span className="section-label font_14 font_weight_600">
                    Plan Information
                  </span>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span>Plan</span>
                      <span className="font_weight_600">
                        {selectedOrder.meta?.planName || selectedOrder.planId}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span>Billing Period</span>
                      <span className="font_weight_600 capitalize">
                        {selectedOrder.period}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span>Order ID</span>
                      <span className="font_12">{selectedOrder._id}</span>
                    </div>
                  </div>
                </div>


                <div className="detail-section">
                  <span className="section-label font_14 font_weight_600">
                    Payment Information
                  </span>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span>Amount</span>
                      <span className="font_weight_600 success">
                        {formatAmount(selectedOrder)}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span>Method</span>
                      <span className="font_weight_600">
                        {selectedOrder.method?.toUpperCase()}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span>Status</span>
                      <span
                        className={`font_weight_600 ${getStatusColor(
                          selectedOrder.status
                        )}`}
                      >
                        {getStatusText(selectedOrder.status)}
                      </span>
                    </div>
                    {selectedOrder.razorpayPaymentId && (
                      <div className="detail-item">
                        <span>Payment ID</span>
                        <span className="font_12">
                          {selectedOrder.razorpayPaymentId}
                        </span>
                      </div>
                    )}
                  </div>
                </div>


                <div className="detail-section">
                  <span className="section-label font_14 font_weight_600">
                    Timeline
                  </span>
                  <div className="timeline">
                    <div className="timeline-item">
                      <div className="timeline-dot success"></div>
                      <div className="timeline-content">
                        <span className="font_12 font_weight_600">
                          Order Created
                        </span>
                        <span
                          className="font_10"
                          style={{ color: "var(--white-50)" }}
                        >
                          {formatDate(selectedOrder.createdAt)}
                        </span>
                      </div>
                    </div>
                    {selectedOrder.paidAt && (
                      <div className="timeline-item">
                        <div className="timeline-dot success"></div>
                        <div className="timeline-content">
                          <span className="font_12 font_weight_600">
                            Payment Completed
                          </span>
                          <span
                            className="font_10"
                            style={{ color: "var(--white-50)" }}
                          >
                            {formatDate(selectedOrder.paidAt)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  className="action-button primary"
                  onClick={() => setViewMode("list")}
                >
                  Close
                </button>
                {selectedOrder.status === "paid" && (
                  <button className="action-button secondary">
                    <Download size={14} />
                    Download Receipt
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence> */}
    </div>
  );
}
