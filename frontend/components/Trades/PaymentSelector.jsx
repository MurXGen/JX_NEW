// components/Trades/PaymentSelector.js
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, CreditCard, Coins, Shield, Zap, Check } from "lucide-react";
import { fetchPlansFromIndexedDB } from "@/utils/fetchAccountAndTrades";
import Link from "next/link";

export default function PaymentSelector({
  planName,
  billingPeriod,
  userCountry,
  amount,
  onClose,
}) {
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [planDetails, setPlanDetails] = useState(null);
  const [loading, setLoading] = useState(false);
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
      name: "Digital payments",
      icon: CreditCard,
      description: "Pay through UPI , Debit & Credit card, etc ",
      available: userCountry === "IN",
      color: "#22c55e",
    },
    {
      id: "crypto",
      name: "Crypto payments",
      icon: Coins,
      description: "Pay with USDT networks",
      available: true,
      color: "#f59e0b",
    },
  ];

  const getFinalPrice = (method) => {
    // If amount is provided directly from props, use it
    if (amount && !isNaN(amount)) {
      return amount;
    }

    // Fallback to planDetails if amount prop is not available
    if (!planDetails) {
      console.error("Plan details not loaded");
      return null;
    }

    let finalPrice;

    if (method === "upi" && userCountry === "IN") {
      finalPrice = planDetails[billingPeriod]?.inr;
    } else if (method === "crypto") {
      if (userCountry === "IN") {
        finalPrice =
          planDetails[billingPeriod]?.inrusdt ||
          planDetails[billingPeriod]?.inrUsdt;
      } else {
        finalPrice = planDetails[billingPeriod]?.usdt;
      }
    }

    // If still no price found, try to get from any available pricing
    if (!finalPrice) {
      const pricing = planDetails[billingPeriod];
      if (pricing) {
        // Get the first available price
        finalPrice =
          pricing.inr || pricing.inrusdt || pricing.inrUsdt || pricing.usdt;
      }
    }

    return finalPrice;
  };

  const handlePayment = async (method) => {
    setLoading(true);
    setSelectedMethod(method);

    try {
      // Get the final price
      const finalPrice = getFinalPrice(method);

      console.log("Payment details:", {
        planName,
        billingPeriod,
        userCountry,
        method,
        finalPrice,
        amountFromProps: amount,
        planDetails,
      });

      // Validate final price
      if (!finalPrice || isNaN(finalPrice) || finalPrice <= 0) {
        alert(
          `Payment not available for this plan. Please try another method.`
        );
        setLoading(false);
        return;
      }

      // Ensure finalPrice is a number and convert to string
      const priceString = Number(finalPrice).toString();

      if (!priceString || priceString === "NaN") {
        alert("Invalid payment amount. Please contact support.");
        setLoading(false);
        return;
      }

      const query = new URLSearchParams({
        planName: planName || "Unknown Plan",
        period: billingPeriod || "monthly",
        method: method || "upi",
        amount: priceString,
      }).toString();

      console.log("Redirecting to checkout with:", query);
      router.push(`/checkoutonline?${query}`);
    } catch (error) {
      console.error("Payment error:", error);
      alert("An error occurred while processing payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Get display amount for UI
  const getDisplayAmount = (method) => {
    const price = getFinalPrice(method);
    if (!price || isNaN(price)) return "Price not available";

    const currency = method === "crypto" && userCountry !== "IN" ? "$" : "₹";
    return `${currency}${Number(price).toLocaleString()}`;
  };

  return (
    <motion.div
      className="cm-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
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
        onClick={(e) => e.stopPropagation()} // Prevent backdrop click from closing
      >
        {/* Header */}
        <div className="flexRow flexRow_stretch">
          <div className="flexClm gap_4">
            <span className="font_18 font_weight_600">
              Select payment method
            </span>
            <span className="font_12" style={{ color: "var(--white-50)" }}>
              {planName} Plan •{" "}
              {billingPeriod === "monthly"
                ? "Monthly"
                : billingPeriod === "yearly"
                ? "Yearly"
                : "Lifetime"}
            </span>
          </div>
          <button
            style={{
              background: "none",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
            onClick={onClose}
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        {/* Payment Methods */}
        <div
          className="payment-methods flexClm gap_24"
          style={{ fontFamily: "var(--ff-pop)" }}
        >
          {paymentMethods.map((method) => {
            const isAvailable = method.available && !loading;
            const displayAmount = getDisplayAmount(method.id);

            return (
              <motion.button
                key={method.id}
                className={`button_sec flexRow flexRow_stretch ${
                  selectedMethod === method.id ? "selected" : ""
                } ${!isAvailable ? "disabled" : ""}`}
                onClick={() => isAvailable && handlePayment(method.id)}
                disabled={!isAvailable || loading}
                whileHover={isAvailable ? { scale: 1.02 } : {}}
                whileTap={isAvailable ? { scale: 0.98 } : {}}
                style={{
                  border: "1px solid var(--white-20)",
                  background: "#222222",
                  padding: "16px",
                  borderRadius: "12px",
                  cursor: isAvailable ? "pointer" : "not-allowed",
                  opacity: isAvailable ? 1 : 0.5,
                }}
              >
                <div className="flexRow flexRow_stretch width100">
                  <div className="flexClm gap_4" style={{ textAlign: "left" }}>
                    <span
                      className="font_14 font_weight_600"
                      style={{ color: "white" }}
                    >
                      {method.name}
                    </span>
                    <span className="font_12 shade_50">
                      {method.description}
                    </span>
                    {/* <span className="font_12 font_weight_600">
                      {displayAmount}
                    </span> */}
                  </div>

                  <div className="flexRow gap_8 flex_center">
                    {selectedMethod === method.id && (
                      <div className="selected-indicator">
                        <Check size={16} color="#22c55e" />
                      </div>
                    )}
                    <div className="method-icon">
                      <method.icon
                        size={24}
                        color={isAvailable ? method.color : "var(--white-20)"}
                      />
                    </div>
                  </div>
                </div>

                {loading && selectedMethod === method.id && (
                  <div className="loading-overlay flexRow flex_center">
                    <Zap size={16} className="animate-spin" />
                    <span className="font_12">Processing...</span>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Security Footer */}
        <div className="security-footer">
          <div className="flexRow gap_8 flex_center">
            <Shield size={16} className="vector" />
            <span className="font_12 shade_50">
              256-bit SSL Encryption • Secure Payment
            </span>
            <Link className="direct_tertiary" href="/contact">
              Need help?
            </Link>
          </div>

          {loading && (
            <div className="flexRow flex_center margin_top_12">
              <span className="font_12 warning">
                Please wait while we process your request...
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
