// components/Pricing/PricingPage.js
"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Diamond,
  Star,
  Zap,
  Check,
  Crown,
  Sparkles,
  Shield,
  Clock,
  Users,
  Rocket,
  StarIcon,
  Sparkle,
  Percent,
  ChevronDown,
  X,
  ArrowLeft,
  ChevronUp,
  Infinity,
} from "lucide-react";
import PaymentSelector from "@/components/Trades/PaymentSelector";
import { fetchPlansFromIndexedDB } from "@/utils/fetchAccountAndTrades";
import Cookies from "js-cookie";
import { useRouter } from "next/router";
import { getFromIndexedDB } from "@/utils/indexedDB";
import FullPageLoader from "@/components/ui/FullPageLoader";
import LegalLinks from "@/components/landingPage/LegalLinks";

function Pricing() {
  const router = useRouter();
  const [billingPeriod, setBillingPeriod] = useState("monthly");
  const [userCountry, setUserCountry] = useState("IN");
  const [plans, setPlans] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);
  const [isHovered, setIsHovered] = useState(null);
  const [currentPlanId, setCurrentPlanId] = useState(null);
  const [expandedPlan, setExpandedPlan] = useState(null);

  const toggleDetails = (planId) => {
    setExpandedPlan((prev) => (prev === planId ? null : planId));
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=en`
            );
            const data = await res.json();
            const country = data.countryCode === "IN" ? "IN" : "OTHER";
            setUserCountry(country);
            localStorage.setItem("userCountry", country);
          } catch {
            setUserCountry("OTHER");
          }
        },
        () => setUserCountry("OTHER")
      );
    } else {
      setUserCountry("OTHER");
    }
  }, []);

  if (userCountry === null) {
    return <FullPageLoader />;
  }

  // Set predefined plans with new structure
  useEffect(() => {
    const staticPlans = [
      {
        name: "Pro",
        planId: "pro",
        description: "Advanced trading analytics",
        monthly: { inr: 149, inrusdt: 2, usdt: 5 },
        yearly: { inr: 1499, inrusdt: 19, usdt: 50 },
        lifetime: null, // Pro doesn't have lifetime
      },
      {
        name: "Master",
        planId: "master",
        description: "Lifetime unlimited access",
        monthly: null, // Master doesn't have monthly
        yearly: null, // Master doesn't have yearly
        lifetime: { inr: 9999, inrusdt: 99, usdt: 119 },
      },
    ];

    setPlans(staticPlans);
  }, []);

  // Load user's current plan
  useEffect(() => {
    (async () => {
      const userData = await getFromIndexedDB("user-data");
      const planId = userData?.subscription?.planId || null;

      if (planId) {
        setCurrentPlanId(planId);
        setActivePlan(planId);
      }
    })();
  }, []);

  // Icon mapping
  const getPlanIcon = (planId) => {
    const baseProps = { size: 24 };
    switch (planId) {
      case "pro":
        return <Diamond {...baseProps} className="plan-icon pro" />;
      case "master":
        return <Crown {...baseProps} className="plan-icon master" />;
      default:
        return <Star {...baseProps} className="plan-icon" />;
    }
  };

  // Feature lists for each plan based on new PLAN_RULES
  const getPlanFeatures = (planId) => {
    const featureTable = [
      {
        title: "Trade Logging",
        free: "10 trades/month",
        pro: "Unlimited trades",
        master: "Unlimited trades",
      },
      {
        title: "Quick Trades",
        free: "10/month",
        pro: "Unlimited",
        master: "Unlimited",
      },
      {
        title: "Multiple Accounts",
        free: "1 account",
        pro: "Up to 3 accounts",
        master: "Up to 3 accounts",
      },
      {
        title: "Image Uploads",
        free: "10 images/month (10MB max)",
        pro: "Unlimited (100MB max)",
        master: "Unlimited (100MB max)",
      },
      {
        title: "Trade History",
        free: "30 days",
        pro: "Full history",
        master: "Full history",
      },
      {
        title: "Export Trades",
        free: "❌",
        pro: "✅ CSV export",
        master: "✅ CSV export",
      },
      {
        title: "Share Trades",
        free: "❌",
        pro: "❌",
        master: "✅ Generate share links",
      },
      {
        title: "AI Analysis",
        free: "❌",
        pro: "✅ AI trade insights",
        master: "✅ AI trade insights",
      },
      {
        title: "Advanced Charts",
        free: "✅ Basic charts",
        pro: "✅ Advanced charts",
        master: "✅ Advanced charts",
      },
      {
        title: "Multiple Entry/Exit",
        free: "✅",
        pro: "✅",
        master: "✅",
      },
      {
        title: "Backup & Sync",
        free: "❌",
        pro: "✅ Cloud backup",
        master: "✅ Cloud backup",
      },
      {
        title: "Ad-free Experience",
        free: "❌",
        pro: "✅ No ads",
        master: "✅ No ads",
      },
      {
        title: "Priority Support",
        free: "❌",
        pro: "✅ Standard support",
        master: "✅ Priority support",
      },
    ];

    return featureTable.map((item) => ({
      title: item.title,
      value:
        planId === "master"
          ? item.master
          : planId === "pro"
          ? item.pro
          : item.free,
    }));
  };

  // Format price display
  const getPriceDisplay = (plan, period) => {
    if (period === "lifetime") {
      if (userCountry === "IN") {
        return {
          price: plan.lifetime?.inr,
          savings: 80, // Lifetime savings percentage
          currency: "₹",
          period: "lifetime",
        };
      } else {
        // For international users, use USDT pricing
        const price =
          userCountry === "INUSDT"
            ? plan.lifetime?.inrusdt
            : plan.lifetime?.usdt;
        return {
          price: price,
          savings: 80,
          currency: "$",
          period: "lifetime",
        };
      }
    }

    // Monthly/Yearly pricing (only for Pro)
    if (userCountry === "IN") {
      const monthlyPrice = plan.monthly?.inr;
      const yearlyPrice = plan.yearly?.inr;
      const yearlySavings = monthlyPrice
        ? Math.round(
            ((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100
          )
        : 0;

      return {
        price: period === "monthly" ? monthlyPrice : yearlyPrice,
        savings: period === "yearly" ? yearlySavings : 0,
        currency: "₹",
        period: period,
      };
    } else {
      const monthlyPrice =
        userCountry === "INUSDT" ? plan.monthly?.inrusdt : plan.monthly?.usdt;
      const yearlyPrice =
        userCountry === "INUSDT" ? plan.yearly?.inrusdt : plan.yearly?.usdt;
      const yearlySavings = monthlyPrice
        ? Math.round(
            ((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100
          )
        : 0;

      return {
        price: period === "monthly" ? monthlyPrice : yearlyPrice,
        savings: period === "yearly" ? yearlySavings : 0,
        currency: "$",
        period: period,
      };
    }
  };

  // Continue button handler
  const handleContinue = (selectedPlanId) => {
    if (!selectedPlanId) return;

    const selectedPlan = plans.find((p) => p.planId === selectedPlanId);
    if (!selectedPlan) return;

    // Determine currency and amount based on user location and billing period
    let amount;
    if (billingPeriod === "lifetime") {
      if (userCountry === "IN") {
        amount = selectedPlan.lifetime?.inr;
      } else {
        amount =
          userCountry === "INUSDT"
            ? selectedPlan.lifetime?.inrusdt
            : selectedPlan.lifetime?.usdt;
      }
    } else {
      // Monthly/Yearly (only for Pro)
      if (userCountry === "IN") {
        amount = selectedPlan[billingPeriod]?.inr;
      } else {
        amount =
          userCountry === "INUSDT"
            ? selectedPlan[billingPeriod]?.inrusdt
            : selectedPlan[billingPeriod]?.usdt;
      }
    }

    if (!amount) {
      console.error("Amount not found for selected plan or billing period.");
      return;
    }

    // INR flow → auto-redirect if low amount
    if (userCountry === "IN" && amount < 450) {
      const query = new URLSearchParams({
        planName: selectedPlan.name,
        planId: selectedPlan.planId,
        period: billingPeriod,
        method: "upi",
        amount: amount.toString(),
      }).toString();

      router.push(`/checkoutonline?${query}`);
      return;
    }

    // Otherwise → show payment selection modal
    setShowPaymentSelector(true);
    setActivePlan(selectedPlanId);
  };

  // Filter plans based on billing period
  const getFilteredPlans = () => {
    if (billingPeriod === "lifetime") {
      return plans.filter((plan) => plan.planId === "master");
    } else {
      return plans.filter((plan) => plan.planId === "pro");
    }
  };

  return (
    <div className="pricing-page flexClm gap_46">
      {/* Header Section */}
      <div className="flexClm gap_32">
        <div className="flexClm flex_center">
          <span className="font_24 font_weight_600">Choose Your Plan</span>
          <span className="font_16 shade_50">
            Upgrade to unlock advanced trading features
          </span>
        </div>
      </div>

      {/* Billing Toggle - Updated for 3 options */}
      <motion.div
        className="width100"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="flexRow gap_12 width100">
          <button
            className={`button_sec width100 ${
              billingPeriod === "monthly" ? "selected" : ""
            }`}
            onClick={() => setBillingPeriod("monthly")}
          >
            Monthly
          </button>
          <button
            className={`button_sec yearly width100 ${
              billingPeriod === "yearly" ? "selected" : ""
            }`}
            style={{ position: "relative" }}
            onClick={() => setBillingPeriod("yearly")}
          >
            Yearly
            <span
              className="flexRow flex_center font_12 gap_4 chart_boxBg success"
              style={{
                position: "absolute",
                top: "-32px",
                right: "0px",
                left: "0px",
                width: "80px",
                margin: "auto",
                padding: "12px",
              }}
            >
              Save more
            </span>
          </button>
          <button
            className={`button_sec yearly width100 ${
              billingPeriod === "lifetime" ? "selected" : ""
            }`}
            style={{ position: "relative" }}
            onClick={() => setBillingPeriod("lifetime")}
          >
            Lifetime
            <span
              className="flexRow font_12 flex_center gap_4 chart_boxBg success"
              style={{
                position: "absolute",
                top: "-32px",
                right: "0px",
                left: "0px",
                width: "80px",
                margin: "auto",
                padding: "12px",
              }}
            >
              Limited time
            </span>
          </button>
        </div>
      </motion.div>

      {/* Plans Grid */}
      <div
        className="gridContainer"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}
      >
        <AnimatePresence>
          {getFilteredPlans().map((plan, index) => {
            const priceInfo = getPriceDisplay(plan, billingPeriod);
            const isActive = activePlan === plan.planId;
            const isCurrent = currentPlanId === plan.planId;
            const features = getPlanFeatures(plan.planId);
            const isExpanded = expandedPlan === plan.planId;

            return (
              <motion.div
                key={plan.planId}
                className={`chart_boxBg pad_16 flexClm gap_24 ${
                  isActive ? "active" : ""
                } ${plan.planId}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{
                  scale: 0.99,
                }}
                whileTap={{
                  scale: 0.97,
                }}
                onHoverStart={() => setIsHovered(plan.planId)}
                onHoverEnd={() => setIsHovered(null)}
                onClick={() => setActivePlan(plan.planId)}
                style={{
                  maxHeight: "fit-content",
                  cursor: "pointer",
                  borderRadius: "16px",
                  transition: "all 0.2s ease",
                }}
              >
                {/* Plan Header */}
                <div className="flexClm gap_12 width100">
                  <div className="flexRow gap_12">
                    <div>{getPlanIcon(plan.planId)}</div>
                    <div className="flexClm">
                      <span className="font_20 font_weight_600">
                        {plan.name}
                      </span>
                      <span className="plan-description font_12">
                        {plan.description}
                      </span>
                    </div>
                  </div>

                  {/* Price Section */}
                  <div>
                    <div className="flexClm">
                      <div style={{ fontSize: "32px" }}>
                        <span>{priceInfo.currency}</span>
                        <span className="font_weight_600">
                          {priceInfo.price}
                        </span>
                      </div>
                      <span className="period font_12">
                        {priceInfo.period === "lifetime"
                          ? "one-time"
                          : priceInfo.period === "monthly"
                          ? "/month"
                          : "/year"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Savings Badge */}
                <div className="flexRow flexRow_stretch gap_12">
                  <a
                    className="direct_tertiary flexRow gap_8 font_12"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDetails(plan.planId);
                    }}
                  >
                    {isExpanded ? "Hide Plan Details" : "Show Plan Details"}
                    {isExpanded ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </a>
                  {priceInfo.savings > 0 && (
                    <div className="success font_12">
                      Save {priceInfo.savings}%
                    </div>
                  )}
                </div>

                {/* CTA Button */}
                <motion.button
                  className={`flexRow gap_4 flex_center ${
                    activePlan === plan.planId ? "button_pri" : "button_sec"
                  }`}
                  disabled={currentPlanId === plan.planId}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (currentPlanId !== plan.planId) {
                      handleContinue(plan.planId);
                    }
                  }}
                >
                  {currentPlanId === plan.planId
                    ? "Current Plan"
                    : billingPeriod === "lifetime"
                    ? "Get Lifetime Access"
                    : "Get Started"}
                  <Zap size={16} />
                </motion.button>

                {/* Plan Features */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      key="features"
                      className="flexClm gap_32"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: "easeInOut" }}
                    >
                      {features.map((feature, idx) => (
                        <motion.div
                          key={idx}
                          className="flexRow flexRow_stretch"
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          transition={{ duration: 0.25, delay: idx * 0.05 }}
                        >
                          <div className="flexRow flexRow_stretch width100 font_12">
                            <strong>{feature.title}:</strong>
                            <span style={{ textAlign: "right" }}>
                              {feature.value !== "✅" && feature.value !== "❌"
                                ? feature.value
                                : ""}
                            </span>
                          </div>
                          {feature.value === "✅" && (
                            <Check size={16} className="feature-icon success" />
                          )}
                          {feature.value === "❌" && (
                            <X size={16} className="feature-icon error" />
                          )}
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Trust Indicators */}
      <motion.div
        className="trust-section"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.8 }}
      >
        <div className="trust-items">
          <div className="trust-item">
            <Shield size={20} className="vector" />
            <span className="font_12">Secure Payment</span>
          </div>
          <div className="trust-item">
            <Clock size={20} className="vector" />
            <span className="font_12">Switch anytime</span>
          </div>
          <div className="trust-item">
            <Users size={20} className="vector" />
            <span className="font_12">Trusted by Traders</span>
          </div>
        </div>
      </motion.div>

      {/* Payment Selector Modal */}
      <AnimatePresence>
        {showPaymentSelector && activePlan && (
          <PaymentSelector
            planName={plans.find((p) => p.planId === activePlan)?.name}
            billingPeriod={billingPeriod}
            userCountry={userCountry}
            amount={
              getPriceDisplay(
                plans.find((p) => p.planId === activePlan),
                billingPeriod
              ).price
            }
            allowUPI={true}
            onClose={() => setShowPaymentSelector(false)}
          />
        )}
      </AnimatePresence>
      <LegalLinks />
    </div>
  );
}

export default Pricing;
