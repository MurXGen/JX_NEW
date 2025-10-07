"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchPlansFromIndexedDB } from "@/utils/fetchAccountAndTrades";
import { motion } from "framer-motion";
import Cookies from "js-cookie";

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

  if (!planDetails)
    return (
      <div className="flex_center" style={{ height: "80vh" }}>
        Loading plan details...
      </div>
    );

  const formattedPrice =
    method === "crypto" ? `${amountParam} USDT` : `₹${amountParam}`;

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
                paymentType === "monthly"
                  ? "button_sec selected width100"
                  : "button_sec width100"
              }
              onClick={() => setPaymentType("monthly")}
            >
              Monthly
            </button>
          </div>
        </div>

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
        onClick={() =>
          alert(
            `Proceeding with ${paymentType} ${method.toUpperCase()} payment...`
          )
        }
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
