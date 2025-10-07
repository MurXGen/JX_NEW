"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { fetchPlansFromIndexedDB } from "@/utils/fetchAccountAndTrades";

export default function PaymentSelector({
  planName,
  billingPeriod,
  userCountry,
  amount,
  onClose,
}) {
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [planDetails, setPlanDetails] = useState(null);
  const router = useRouter();

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

  const handlePayment = (method) => {
    setSelectedMethod(method);

    if (!planDetails) {
      alert("Plan data not loaded yet. Please try again.");
      return;
    }

    let finalPrice = amount;

    if (method === "upi" && userCountry === "IN") {
      finalPrice = amount; // normal INR
    } else if (method === "crypto") {
      // Use inrUsdt from planDetails if India, else usdt
      if (userCountry === "IN") {
        finalPrice = planDetails[billingPeriod]?.inrUsdt;
        if (!finalPrice || finalPrice <= 0) {
          alert("Crypto payment not available for this plan.");
          return;
        }
      } else {
        finalPrice = planDetails[billingPeriod]?.usdt;
      }
    } else {
      alert("Crypto payments are only available for international users.");
      return;
    }

    const query = new URLSearchParams({
      planName,
      period: billingPeriod,
      method,
      amount: finalPrice.toString(),
    }).toString();

    router.push(`/checkoutonline?${query}`);
  };

  return (
    <div className="cm-backdrop">
      <motion.div
        className="chart_boxBg flexClm gap_24"
        style={{ padding: "24px", position: "relative" }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "-44px",
            left: "50%",
            transform: "translateX(-50%)",
          }}
          className="button_ter flexRow flexRow_center"
        >
          <X size={20} />
        </button>

        <span className="font_16">Select your payment method:</span>
        <div className="flexClm gap_12">
          <button className="button_ter" onClick={() => handlePayment("upi")}>
            Pay with UPI
          </button>
          <button
            className="button_ter"
            onClick={() => handlePayment("crypto")}
          >
            Pay with Crypto
          </button>
        </div>
      </motion.div>
    </div>
  );
}
