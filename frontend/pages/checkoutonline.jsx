"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchPlansFromIndexedDB } from "@/utils/fetchAccountAndTrades";
import { motion } from "framer-motion";
import Cookies from "js-cookie";
import axios from "axios";
import { loadRazorpayScript } from "@/utils/loadRazorpay";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export default function CheckoutOnline() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const planName = searchParams.get("planName");
  const period = searchParams.get("period");
  const method = searchParams.get("method");
  const amountParam = searchParams.get("amount");

  const [planDetails, setPlanDetails] = useState(null);
  const [paymentType, setPaymentType] = useState("one-time"); // ✅ new state

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

  if (!planDetails)
    return (
      <div className="flex_center" style={{ height: "80vh" }}>
        Loading plan details...
      </div>
    );

  const formattedPrice =
    method === "crypto" ? `${amountParam} USDT` : `₹${amountParam}`;

  const handleConfirmPay = async () => {
    if (method === "crypto") {
      router.push(
        `/cryptobilling?planName=${planDetails.name}&period=${period}&amount=${amountParam}`
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
        return;
      }

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
            // successful payment
            await axios.post(
              `${API_BASE}/api/payments/verify-payment`,
              response
            );

            router.push("/subscription-success");
          },
          modal: {
            ondismiss: function () {
              // triggered when user closes the Razorpay modal
              alert("Payment cancelled");
              router.push("/subscription-failed");
            },
          },
          //   prefill: { name: userName, email: userEmail },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else if (paymentType === "monthly" || paymentType === "recurring") {
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
            // Instead of redirecting immediately
            try {
              const verifyRes = await axios.post(
                `${API_BASE}/api/payments/verify-subscription`,
                response,
                { withCredentials: true }
              );
              if (verifyRes.data.success) {
                router.push("/subscription-success");
              } else {
                router.push("/subscription-failed");
              }
            } catch (err) {
              console.error("Subscription verification failed", err);
              router.push("/subscription-failed");
            }
          },
          modal: {
            ondismiss: function () {
              // Show cancelled page
              router.push("/subscription-failed");
            },
          },
          //   prefill: { name: userName, email: userEmail },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (err) {
      console.error("payment error", err);
      alert(err.response?.data?.message || "Payment failed");
    }
  };

  return (
    <motion.div
      className="chart_boxBg flexClm gap_24"
      style={{
        padding: "32px",
        maxWidth: "500px",
        margin: "0 auto",
      }}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <span className="font_20">Checkout Summary</span>

      <div className="flexClm gap_12">
        <div className="flexRow space_between">
          <span>Plan Selected:</span>
          <strong>{planDetails.name}</strong>
        </div>

        <div className="flexRow space_between">
          <span>Billing Period:</span>
          <strong>{period.charAt(0).toUpperCase() + period.slice(1)}</strong>
        </div>

        <div className="flexRow space_between">
          <span>Payment Method:</span>
          <strong>{method.toUpperCase()}</strong>
        </div>

        {/* ✅ New Payment Type selector */}
        {period === "monthly" && method !== "crypto" && (
          <div className="flexClm gap_8 mt-8">
            <span className="font_14">Payment Type:</span>
            <div className="flexRow gap_8">
              <button
                className={
                  paymentType === "one-time"
                    ? "button_sec selected width100"
                    : "button_sec width100"
                }
                onClick={() => setPaymentType("one-time")}
              >
                One-time
              </button>

              <button
                className={
                  paymentType === "recurring"
                    ? "button_sec selected width100"
                    : "button_sec width100"
                }
                onClick={() => setPaymentType("recurring")}
              >
                Recurring
              </button>
            </div>
          </div>
        )}

        <div className="flexRow space_between mt-12">
          <span>Total Amount:</span>
          <strong>{formattedPrice}</strong>
        </div>
      </div>

      <motion.button
        className="button_pri mt-12"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        onClick={handleConfirmPay}
      >
        Confirm & Pay
      </motion.button>

      <button
        className="button_ter"
        style={{ marginTop: "8px" }}
        onClick={() => router.back()}
      >
        Go Back
      </button>
    </motion.div>
  );
}
