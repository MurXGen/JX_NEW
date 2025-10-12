// components/Subscription/SubscriptionSuccess.js
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import {
  CheckCircle,
  Calendar,
  Clock,
  Zap,
  Crown,
  Sparkles,
  Users,
  ArrowRight,
  Shield,
} from "lucide-react";
import { formatCurrency } from "@/utils/formatNumbers";

export default function SubscriptionSuccess() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orderDetails, setOrderDetails] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    // Trigger confetti immediately on mount
    setShowConfetti(true);

    if (showConfetti) {
      const duration = 3 * 1000; // 3 seconds
      const animationEnd = Date.now() + duration;
      const defaults = {
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        zIndex: 9999,
      };

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        const particleCount = 5 + Math.random() * 5; // particles per tick
        confetti({
          ...defaults,
          particleCount,
          origin: {
            x: Math.random(), // random horizontal start
            y: 0, // always start from top
          },
        });
      }, 250);
    }
  }, [showConfetti]);

  useEffect(() => {
    const planName = searchParams.get("planName") || "Pro Plan";
    const period = searchParams.get("period") || "monthly";
    const amount = searchParams.get("amount") || "2999";
    const startDate = new Date(searchParams.get("start") || Date.now());
    const expiryDate = new Date(searchParams.get("expiry") || Date.now());

    setOrderDetails({
      planName,
      period,
      amount,
      startDate,
      expiryDate,
      orderId: `ORD${Date.now().toString().slice(-8)}`,
      paymentMethod: searchParams.get("method") || "UPI",
    });
  }, [searchParams]);

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getPlanIcon = (planName) => {
    if (planName.toLowerCase().includes("pro"))
      return <Crown size={24} className="vector" />;
    if (planName.toLowerCase().includes("elite"))
      return <Sparkles size={24} className="vector" />;
    if (planName.toLowerCase().includes("master"))
      return <Zap size={24} className="vector" />;
    return <Users size={24} className="vector" />;
  };

  const getWelcomeBenefits = () => [
    "Full access to premium features",
    "Advanced analytics & insights",
    "Priority customer support",
    "Mobile app synchronization",
    "Regular feature updates",
  ];

  return (
    <div className="subscription-success">
      {/* Background Celebration Effect */}
      {showConfetti && <div id="confetti-container"></div>}

      <div className="flexClm gap_24">
        {/* Success Header */}
        <motion.div
          className="flexClm flex_center gap_12"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, type: "spring" }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 200,
              delay: 0.2,
            }}
            className="success-icon"
          >
            <CheckCircle size={80} className="success" />
          </motion.div>
          <span className="font_24 font_weight_600">Happy Jorunaling !!!</span>
          <span
            className="font_12"
            style={{
              color: "var(--white-50)",
              margin: "0 auto",
              textAlign: "center",
            }}
          >
            Your subscription is now active. Get ready to transform your trading
            experience.
          </span>
        </motion.div>

        {/* Order Summary */}
        <motion.div
          className="order-summary-card chart_boxBg"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="summary-header">
            <div className="flexRow gap_12">
              {orderDetails && getPlanIcon(orderDetails.planName)}
              <div className="flexClm">
                <span className="font_18 font_weight_600">Order Confirmed</span>
                <span className="font_12" style={{ color: "var(--white-50)" }}>
                  Order ID: {orderDetails?.orderId}
                </span>
              </div>
            </div>
          </div>

          <div className="order-details">
            <div className="detail-row flexRow flexRow_stretch">
              <span className="font_14">Plan</span>
              <span className="font_16 font_weight_600">
                {orderDetails?.planName}
              </span>
            </div>

            <div className="detail-row flexRow flexRow_stretch">
              <span className="font_14">Billing Period</span>
              <span className="font_14 font_weight_600 capitalize">
                {orderDetails?.period}
              </span>
            </div>

            <div className="detail-row flexRow flexRow_stretch">
              <span className="font_14">Amount Paid</span>
              <span className="font_18 font_weight_600">
                {orderDetails?.paymentMethod === "crypto"
                  ? `${orderDetails?.amount || "0"} USDT`
                  : `₹${orderDetails?.amount || "0"}`}
              </span>
            </div>

            <div className="detail-row flexRow flexRow_stretch">
              <span className="font_14">Payment Method</span>
              <span className="font_14 font_weight_600">
                {orderDetails?.paymentMethod?.toUpperCase()}
              </span>
            </div>

            {/* Subscription Timeline */}
            <div className="timeline-section">
              <div className="timeline-item">
                <Calendar size={18} className="vector" />
                <div className="timeline-content">
                  <span className="font_12">Activated On</span>
                  <span className="font_14 font_weight_600">
                    {orderDetails
                      ? formatDate(orderDetails.startDate)
                      : "Today"}
                  </span>
                </div>
              </div>
              <div className="timeline-item">
                <Clock size={18} className="vector" />
                <div className="timeline-content">
                  <span className="font_12">Renews On</span>
                  <span className="font_14 font_weight_600">
                    {orderDetails
                      ? formatDate(orderDetails.expiryDate)
                      : "Next month"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Welcome Benefits */}
        {/* <motion.div
          className="benefits-card chart_boxBg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <div className="benefits-header">
            <span className="font_16 font_weight_600">What's Next?</span>
            <p className="font_12" style={{ color: "var(--white-50)" }}>
              Start exploring your premium features
            </p>
          </div>

          <div className="benefits-list">
            {getWelcomeBenefits().map((benefit, index) => (
              <motion.div
                key={index}
                className="benefit-item flexRow gap_12"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.8 + index * 0.1 }}
              >
                <div className="benefit-icon">
                  <CheckCircle size={16} className="success" />
                </div>
                <span className="font_14">{benefit}</span>
              </motion.div>
            ))}
          </div>
        </motion.div> */}

        {/* Trust & Next Steps */}
        <motion.div
          className="next-steps"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1 }}
        >
          <div className="trust-badges flexRow gap_24 flex_center">
            <div className="trust-item flexRow gap_8">
              <Shield size={16} className="vector" />
              <span className="font_12">Secure Payment</span>
            </div>
            <div className="trust-item flexRow gap_8">
              <Clock size={16} className="vector" />
              <span className="font_12">Instant Activation</span>
            </div>
          </div>

          {/* Primary CTA */}
          <motion.button
            className="button_pri flexRow gap_8 flex_center"
            onClick={() => router.push("/accounts")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>Go to Dashboard</span>
            <ArrowRight size={18} />
          </motion.button>

          <button
            className="support-link"
            onClick={() => router.push("/support")}
          >
            Need help? Contact Support
          </button>
        </motion.div>
      </div>
    </div>
  );
}
