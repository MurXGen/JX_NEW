// components/Pricing/PaymentSelector.js
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, CreditCard, Coins, Shield, Zap, Check } from "lucide-react";
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

  const paymentMethods = [
    {
      id: "upi",
      name: "Online payment",
      icon: CreditCard,
      description: "Pay through UPI , Debit & Credit card, etc ",
      available: userCountry === "IN",
      color: "#22c55e",
    },
    // {
    //   id: "crypto",
    //   name: "Crypto Payment",
    //   icon: Coins,
    //   description: "Pay with USDT networks",
    //   available: true,
    //   color: "#f59e0b",
    // },
  ];

  const handlePayment = (method) => {
    setSelectedMethod(method);

    if (!planDetails) {
      alert("Plan data not loaded yet. Please try again.");
      return;
    }

    let finalPrice = amount;

    if (method === "upi" && userCountry === "IN") {
      finalPrice = amount;
    } else if (method === "crypto") {
      if (userCountry === "IN") {
        finalPrice = planDetails[billingPeriod]?.inrUsdt;
        if (!finalPrice || finalPrice <= 0) {
          alert("Crypto payment not available for this plan.");
          return;
        }
      } else {
        finalPrice = planDetails[billingPeriod]?.usdt;
      }
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
    <motion.div
      className="cm-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="chart_boxBg flexClm gap_32"
        style={{
          padding: "24px",
          minWidth: "300px",
          maxWidth: "400px",
          margin: "0 20px",
          width: "100%",
        }}
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 20 }}
        transition={{ type: "spring", damping: 25 }}
      >
        {/* Header */}
        <div className="flexRow flexRow_stretch">
          <div className="flexClm gap_4">
            <span className="font_18 font_weight_600">
              Select payment method
            </span>
            <span className="font_12" style={{ color: "var(--white-50)" }}>
              {planName} Plan •{" "}
              {billingPeriod === "monthly" ? "Monthly" : "Yearly"}
            </span>
          </div>
          <button className="close-btn button_ter" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Payment Methods */}
        <div className="payment-methods flexClm gap_12">
          {paymentMethods.map((method) => (
            <motion.button
              key={method.id}
              className={`payment-method flexRow flexRow_stretch ${
                selectedMethod === method.id ? "selected" : ""
              } ${!method.available ? "disabled" : ""}`}
              onClick={() => method.available && handlePayment(method.id)}
              disabled={!method.available}
              whileHover={method.available ? { scale: 1.02 } : {}}
              whileTap={method.available ? { scale: 0.98 } : {}}
              style={{ borderLeftColor: method.color }}
            >
              <div
                className="flexClm gap_12"
                style={{ textAlign: "left", color: "white" }}
              >
                <span className="font_14 font_weight_600">{method.name}</span>
                <span className="font_12 shade_50">{method.description}</span>
                {selectedMethod === method.id && (
                  <div className="selected-indicator">
                    <Check size={16} />
                  </div>
                )}
              </div>
              <div className="method-icon">
                <method.icon size={24} color="white" />
              </div>
            </motion.button>
          ))}
        </div>

        {/* Security Footer */}
        <div className="">
          <div className="flexRow gap_8">
            <Shield size={16} className="vector" />
            <span className="font_12 shade_50">
              256-bit SSL Encryption • Secure Payment
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
