"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Diamond, Star, Zap } from "lucide-react";
import PaymentSelector from "@/components/Trades/PaymentSelector";
import { fetchPlansFromIndexedDB } from "@/utils/fetchAccountAndTrades";
import Cookies from "js-cookie";
import { useRouter } from "next/router";

function Pricing() {
  const router = useRouter();
  const [billingPeriod, setBillingPeriod] = useState("monthly");
  const [userCountry, setUserCountry] = useState("OTHER");
  const [plans, setPlans] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);

  useEffect(() => {
    const verified = Cookies.get("isVerified");

    if (verified !== "yes") {
      router.push("/login");
      return;
    }
  });

  // Detect user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=en`
            );
            const data = await res.json();
            setUserCountry(data.countryCode === "IN" ? "IN" : "OTHER");
            localStorage.setItem("userCountry", data.countryCode);
          } catch {
            setUserCountry("OTHER");
          }
        },
        () => setUserCountry("OTHER")
      );
    } else setUserCountry("OTHER");
  }, []);

  // Fetch plans from IndexedDB
  useEffect(() => {
    (async () => {
      const data = await fetchPlansFromIndexedDB();
      setPlans(data);
    })();
  }, []);

  // Icon mapping (based on planId)
  const getIcon = (planId) => {
    switch (planId) {
      case "pro":
        return <Diamond size={20} color="skyblue" />;
      case "elite":
        return <Zap size={20} color="orange" />;
      case "master":
        return <Star size={20} color="yellow" />;
      default:
        return null;
    }
  };

  // Format price display
  const getPriceDisplay = (plan, period) => {
    if (userCountry === "IN") {
      return <span>₹{plan[period]?.inr}</span>;
    } else {
      return <span>{plan[period]?.usdt} USDT</span>;
    }
  };

  // Continue button handler
  const handleContinue = () => {
    if (!activePlan) return;
    setShowPaymentSelector(true);
  };

  return (
    <div className="flexClm gap_24">
      <div className="flexClm">
        <span className="font_20">Choose your plan</span>
        <span className="font_12">
          Select the plan suitable for your trading style
        </span>
      </div>

      {/* Billing toggle */}
      <div className="flexRow flex_center gap_8 relative">
        <button
          className={
            billingPeriod === "monthly"
              ? "button_sec selected width100"
              : "button_sec width100"
          }
          onClick={() => setBillingPeriod("monthly")}
        >
          Monthly
        </button>

        <div className="width100" style={{ position: "relative" }}>
          <button
            className={
              billingPeriod === "yearly"
                ? "button_sec selected width100 flexRow gap_12 flex_center"
                : "button_sec width100 flexRow gap_12 flex_center"
            }
            onClick={() => setBillingPeriod("yearly")}
          >
            Yearly
            <span
              style={{
                position: "absolute",
                top: "-20px",
                background: "var(--success)",
                color: "#000",
                fontSize: "14px",
                fontWeight: "600",
                padding: "2px 6px",
                borderRadius: "8px",
                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              }}
              className="flexRow flex_center"
            >
              <Zap size={14} />
              20% OFF
            </span>
          </button>
        </div>
      </div>

      {/* Plan list */}
      <div className="flexClm gap_16">
        {plans.map((plan) => {
          const isActive = activePlan === plan.planId;
          return (
            <motion.div
              key={plan.planId}
              className={`chart_boxBg flexRow flexRow_stretch ${
                isActive ? "selected" : ""
              }`}
              style={{
                borderRadius: "12px",
                cursor: "pointer",
                padding: "16px",
              }}
              onClick={() => setActivePlan(plan.planId)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flexClm gap_8">
                {getIcon(plan.planId)}
                <span className="font_20">{plan.name}</span>
              </div>
              <div className="flexClm" style={{ textAlign: "right" }}>
                <span className="font_16">
                  {getPriceDisplay(plan, billingPeriod)}
                </span>
                <span className="font_8">
                  {billingPeriod === "monthly" ? "/Per month" : "/Yearly"}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {activePlan && !showPaymentSelector && (
        <motion.button
          className="button_pri mt-12"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          onClick={handleContinue}
        >
          Continue with {plans.find((p) => p.planId === activePlan)?.name}
        </motion.button>
      )}

      {showPaymentSelector && activePlan && (
        <PaymentSelector
          planName={plans.find((p) => p.planId === activePlan)?.name}
          billingPeriod={billingPeriod}
          userCountry={userCountry}
          amount={
            userCountry === "IN"
              ? plans.find((p) => p.planId === activePlan)?.[billingPeriod]?.inr
              : plans.find((p) => p.planId === activePlan)?.[billingPeriod]
                  ?.usdt
          }
          allowUPI={true}
          onClose={() => setShowPaymentSelector(false)}
        />
      )}
    </div>
  );
}

export default Pricing;
