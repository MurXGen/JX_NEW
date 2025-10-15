"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchPlansFromIndexedDB } from "@/utils/fetchAccountAndTrades";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Shield,
  Zap,
  Calendar,
  Clock,
  ArrowLeft,
  BadgeCheck,
  Sparkles,
  Crown,
} from "lucide-react";
import Cookies from "js-cookie";
import axios from "axios";
import { loadRazorpayScript } from "@/utils/loadRazorpay";
import FullPageLoader from "@/components/ui/FullPageLoader";
import { getFromIndexedDB, saveToIndexedDB } from "@/utils/indexedDB";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export default function CheckoutOnline() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const planName = searchParams.get("planName");
  const period = searchParams.get("period");
  const method = searchParams.get("method");
  const amountParam = searchParams.get("amount");

  const [planDetails, setPlanDetails] = useState(null);
  const [paymentType, setPaymentType] = useState("one-time");
  const [isProcessing, setIsProcessing] = useState(false);

  // Calculate dates
  const startDate = new Date();
  const expiryDate = new Date();
  if (period === "monthly") {
    expiryDate.setMonth(expiryDate.getMonth() + 1);
  } else {
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  }

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Redirect unverified users
  useEffect(() => {
    const verified = Cookies.get("isVerified");
    if (verified !== "yes") router.push("/login");
  }, [router]);

  // Fetch plan details from IndexedDB
  useEffect(() => {
    (async () => {
      if (!planName) return;

      const plans = await fetchPlansFromIndexedDB();
      const match = plans.find(
        (p) => p.name?.toLowerCase() === planName?.toLowerCase()
      );
      setPlanDetails(match || null);
    })();
  }, [planName]);

  useEffect(() => {
    if (period === "yearly" || method === "crypto") {
      setPaymentType("one-time");
    }
  }, [period, method]);

  const formattedPrice =
    method === "crypto" ? `${amountParam} USDT` : `₹${amountParam}`;

  const getPaymentMethodIcon = () => {
    switch (method) {
      case "crypto":
        return <Zap size={20} className="vector" />;
      case "upi":
        return <Shield size={20} className="success" />;
      default:
        return <BadgeCheck size={20} className="vector" />;
    }
  };

  const getPlanIcon = () => {
    switch (planDetails?.planId) {
      case "pro":
        return <Crown size={24} className="vector" />;
      case "elite":
        return <Sparkles size={24} className="vector" />;
      case "master":
        return <Zap size={24} className="vector" />;
      default:
        return <BadgeCheck size={24} className="vector" />;
    }
  };

  const handleConfirmPay = async () => {
    setIsProcessing(true);

    if (method === "crypto") {
      router.push(
        `/cryptobillingpage?planName=${planDetails.name}&period=${period}&amount=${amountParam}`
      );
      return;
    }

    const payload = {
      planId: planDetails.planId,
      period,
      userName: planDetails.name,
      userEmail: planDetails.email || "",
    };

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        alert("Razorpay SDK failed to load");
        setIsProcessing(false);
        return;
      }

      const handleSuccess = async (orderId) => {
        // ✅ Fetch the latest user-data from IndexedDB
        const userData = await getFromIndexedDB("user-data");

        // ✅ Construct subscription object
        const now = new Date();
        const expiry = new Date(now);
        if (period === "yearly") expiry.setFullYear(expiry.getFullYear() + 1);
        else expiry.setMonth(expiry.getMonth() + 1);

        const newSubscription = {
          planId: planDetails.planId,
          status: "active",
          type: paymentType === "recurring" ? "recurring" : "one-time",
          startAt: now.toISOString(),
          expiresAt: expiry.toISOString(),
          createdAt: now.toISOString(),
        };

        // ✅ Store subscription inside subscription array/object
        const updatedUser = {
          ...userData,
          subscription: newSubscription, // overwrite existing subscription
        };

        await saveToIndexedDB("user-data", updatedUser);

        // ✅ Redirect to success page
        router.push(
          `/subscription-success?planName=${encodeURIComponent(
            planDetails.name
          )}&period=${period}&amount=${amountParam}&method=${paymentType}&start=${now.toISOString()}&expiry=${expiry.toISOString()}&orderId=${orderId}`
        );
      };

      if (paymentType === "one-time") {
        const createRes = await axios.post(
          `${API_BASE}/api/payments/create-order`,
          payload,
          { withCredentials: true }
        );
        const { order, key } = createRes.data;

        const options = {
          key,
          amount: order.amount,
          currency: "INR",
          name: "JournalX",
          description: "Order description",
          order_id: order.id,
          handler: async function (response) {
            await axios.post(
              `${API_BASE}/api/payments/verify-payment`,
              response
            );
            await handleSuccess(order.id);
          },
          modal: {
            ondismiss: function () {
              setIsProcessing(false);
              router.push(
                `/subscription-failed?planName=${encodeURIComponent(
                  planDetails.name
                )}&period=${period}&amount=${amountParam}&method=${paymentType}`
              );
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else if (paymentType === "recurring") {
        const createRes = await axios.post(
          `${API_BASE}/api/payments/create-subscription`,
          payload,
          { withCredentials: true }
        );
        const { subscription, key } = createRes.data;

        const options = {
          key,
          name: "JournalX",
          description: `${planDetails.name} subscription`,
          subscription_id: subscription.id,
          handler: async function (response) {
            try {
              const verifyRes = await axios.post(
                `${API_BASE}/api/payments/verify-subscription`,
                response,
                { withCredentials: true }
              );
              if (verifyRes.data.success) {
                await handleSuccess();
              } else {
                router.push(
                  `/subscription-failed?planName=${encodeURIComponent(
                    planDetails.name
                  )}&period=${period}&amount=${amountParam}&method=${paymentType}`
                );
              }
            } catch (err) {
              router.push(
                `/subscription-failed?planName=${encodeURIComponent(
                  planDetails.name
                )}&period=${period}&amount=${amountParam}&method=${paymentType}`
              );
            }
          },
          modal: {
            ondismiss: function () {
              setIsProcessing(false);
              router.push(
                `/subscription-failed?planName=${encodeURIComponent(
                  planDetails.name
                )}&period=${period}&amount=${amountParam}&method=${paymentType}`
              );
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Payment failed");
      setIsProcessing(false);
    }
  };

  if (!planDetails) return <FullPageLoader />;

  return (
    <div className="checkout-container flexClm gap_12">
      {/* Header */}
      <motion.div
        className="checkout-header text-center flexClm"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <span className="font_20">Complete Your Purchase</span>
        <span className="font_12">
          You're one step away from premium trading features
        </span>
      </motion.div>

      <div>
        <div className="flexClm"></div>
      </div>

      <div className="checkout-content">
        {/* Order Summary Card */}
        <motion.div
          className="order-summary chart_boxBg"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="summary-header">
            <div className="plan-badge flexRow gap_8">
              {getPlanIcon()}
              <span className="font_16 font_weight_600">Order Summary</span>
            </div>
          </div>

          <div className="plan-details">
            <div className="plan-main flexRow flexRow_stretch">
              <div className="flexClm">
                <span className="font_18 font_weight_600">
                  {planDetails.name}
                </span>
                <span className="font_12" style={{ color: "var(--white-50)" }}>
                  {period === "monthly" ? "Monthly Plan" : "Annual Plan"}
                </span>
              </div>
              <div className="price-tag">
                <span className="font_20 font_weight_700">
                  {formattedPrice}
                </span>
              </div>
            </div>

            {/* Subscription Timeline */}
            <div className="timeline-section flexRow flexRow_stretch">
              <div className="timeline-item">
                <Calendar size={16} className="vector" />
                <div className="timeline-content">
                  <span className="font_12">Starts</span>
                  <span className="font_14 font_weight_600">
                    {formatDate(startDate)}
                  </span>
                </div>
              </div>
              <div
                className="timeline-item"
                style={{
                  textAlign: "right",
                  justifyContent: "end",
                  flexDirection: "row-reverse",
                }}
              >
                <Clock size={16} className="vector" />
                <div className="timeline-content">
                  <span className="font_12">Expires</span>
                  <span className="font_14 font_weight_600">
                    {formatDate(expiryDate)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="payment-section">
            <div className="section-title font_14 font_weight_600">
              Payment Method
            </div>
            <div className="payment-method-display flexRow gap_12">
              {getPaymentMethodIcon()}
              <div className="flexClm">
                <span className="font_14 font_weight_600">
                  {method === "crypto" ? "Crypto Payment" : "UPI Payment"}
                </span>
                <span className="font_12" style={{ color: "var(--white-50)" }}>
                  {method === "crypto"
                    ? "Pay with USDT, BTC, ETH"
                    : "Instant UPI payment"}
                </span>
              </div>
            </div>

            {/* Payment Type Toggle */}
            <AnimatePresence>
              {period === "monthly" && method !== "crypto" && (
                <motion.div
                  className="payment-type-toggle"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="toggle-header font_12">Payment Type</div>
                  <div className="toggle-buttons">
                    <button
                      className={`toggle-option ${
                        paymentType === "one-time" ? "active" : ""
                      }`}
                      onClick={() => setPaymentType("one-time")}
                    >
                      <div
                        className="flexClm gap_4"
                        style={{ textAlign: "left" }}
                      >
                        <span className="font_14 font_weight_600">
                          One-time
                        </span>
                        <span className="font_12">Pay once</span>
                      </div>
                      {paymentType === "one-time" && (
                        <Check size={16} className="success" />
                      )}
                    </button>
                    <button
                      className={`toggle-option ${
                        paymentType === "recurring" ? "active" : ""
                      }`}
                      onClick={() => setPaymentType("recurring")}
                    >
                      <div
                        className="flexClm gap_4"
                        style={{ textAlign: "left" }}
                      >
                        <span className="font_14 font_weight_600">
                          Auto-renew
                        </span>
                        <span className="font_12">Never miss access</span>
                      </div>
                      {paymentType === "recurring" && (
                        <Check size={16} className="success" />
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Total Amount */}
          <div className="total-section">
            <div className="total-line flexRow flexRow_stretch">
              <span className="font_16">Total Amount</span>
              <span className="font_20 font_weight_700">{formattedPrice}</span>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          className="action-buttons"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <motion.button
            className="button_pri"
            onClick={handleConfirmPay}
            disabled={isProcessing}
            whileHover={{ scale: isProcessing ? 1 : 1.02 }}
            whileTap={{ scale: isProcessing ? 1 : 0.98 }}
          >
            <AnimatePresence mode="wait">
              {isProcessing ? (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flexRow gap_4 flex_center"
                >
                  <div className="spinner"></div>
                  Processing...
                </motion.div>
              ) : (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flexRow gap_4 flex_center"
                >
                  <Zap size={18} />
                  Confirm & Pay
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          <button
            className="button_ter flexRow gap_4 flex_center"
            onClick={() => router.back()}
            disabled={isProcessing}
          >
            <ArrowLeft size={16} />
            Go Back
          </button>
        </motion.div>

        {/* Trust Indicators */}
        <motion.div
          className="trust-indicators"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="trust-item">
            <Shield size={16} className="vector" />
            <span className="font_12">256-bit SSL Secure Payment</span>
          </div>
          <div className="trust-item">
            <Check size={16} className="success" />
            <span className="font_12">Cancel Anytime • 30-day Guarantee</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
