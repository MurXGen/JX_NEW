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
} from "lucide-react";
import PaymentSelector from "@/components/Trades/PaymentSelector";
import { fetchPlansFromIndexedDB } from "@/utils/fetchAccountAndTrades";
import Cookies from "js-cookie";
import { useRouter } from "next/router";
import { getFromIndexedDB } from "@/utils/indexedDB";
import FullPageLoader from "@/components/ui/FullPageLoader";

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

  //   useEffect(() => {
  //     const verified = Cookies.get("isVerified");
  //     if (verified !== "yes") {
  //       router.push("/login");
  //       return;
  //     }
  //   });

  useEffect(() => {
    (async () => {
      const data = await fetchPlansFromIndexedDB();
      setPlans(data);

      const userData = await getFromIndexedDB("user-data");
      const currentPlanId = userData?.subscription?.planId || null;

      if (currentPlanId) {
        setActivePlan(currentPlanId); // set current plan as active
      } else if (data.length >= 2) {
        setActivePlan(data[1].planId); // fallback: middle plan
      }
    })();
  }, []);

  // Fetch plans from IndexedDB
  useEffect(() => {
    // Load user data and set current plan
    (async () => {
      const userData = await getFromIndexedDB("user-data");
      if (userData?.subscription?.planId) {
        setCurrentPlanId(userData.subscription.planId);
        // Optional: auto-select current plan in UI
        setActivePlan(userData.subscription.planId);
      } else if (plans.length >= 2) {
        // fallback: select middle plan (usually Pro)
        setActivePlan(plans[1].planId);
      }
    })();
  }, [plans]);

  // Icon mapping with premium styling
  const getPlanIcon = (planId) => {
    const baseProps = { size: 24 };
    switch (planId) {
      case "pro":
        return <Diamond {...baseProps} className="plan-icon pro" />;
      case "elite":
        return <Crown {...baseProps} className="plan-icon elite" />;
      case "master":
        return <Rocket {...baseProps} className="plan-icon master" />;
      default:
        return <Star {...baseProps} className="plan-icon" />;
    }
  };

  // Feature lists for each plan
  const getPlanFeatures = (planId) => {
    const featureTable = [
      {
        title: "Trades Logging",
        basic: "Up to 10 trades/month (ads after 10)",
        pro: "Unlimited",
        elite: "Unlimited",
        master: "Unlimited",
      },
      {
        title: "Multiple Accounts",
        basic: "1 account",
        pro: "Up to 2 accounts",
        elite: "Up to 3 accounts",
        master: "Up to 5 accounts",
      },
      {
        title: "Image Uploads",
        basic: "Max 5 MB per screenshot, 10 MB per trade; up to 5 trades/month",
        pro: "Up to 60 images/month",
        elite: "Unlimited trade images",
        master: "Unlimited trade images",
      },
      {
        title: "Trade History",
        basic: "Last 30 days",
        pro: "Last 90 days",
        elite: "All trades",
        master: "All trades",
      },
      {
        title: "Referrals / Invites",
        basic: "—",
        pro: "—",
        elite: "—",
        master: "—",
      },
      {
        title: "Financial News Feed",
        basic: "❌",
        pro: "❌",
        elite: "✅",
        master: "✅ (with priority access)",
      },
      {
        title: "Early Beta Access",
        basic: "❌",
        pro: "❌",
        elite: "✅",
        master: "✅ + premium features first",
      },
      {
        title: "Priority Support",
        basic: "❌",
        pro: "❌",
        elite: "Standard support",
        master: "✅ Dedicated support",
      },
      {
        title: "Multiple Entry/Exit Support",
        basic: "✅",
        pro: "✅",
        elite: "✅",
        master: "✅",
      },
      {
        title: "Quick Trade Log",
        basic: "✅",
        pro: "✅",
        elite: "✅",
        master: "✅",
      },
      {
        title: "Advanced Charts",
        basic: "✅",
        pro: "✅",
        elite: "✅",
        master: "✅",
      },
      {
        title: "Multi-device Access",
        basic: "Only one device login",
        pro: "Multiple devices",
        elite: "Multiple devices",
        master: "Multiple devices",
      },
      {
        title: "Telegram Bot Trade Log",
        basic: "❌",
        pro: "❌",
        elite: "✅",
        master: "✅",
      },
      {
        title: "AI Chat Bot",
        basic: "❌",
        pro: "Up to 5 prompts",
        elite: "✅",
        master: "✅",
      },
      {
        title: "Export / Import Trades (New)",
        basic: "❌",
        pro: "✅",
        elite: "✅",
        master: "✅",
      },
      {
        title: "Share Trades (New)",
        basic: "❌",
        pro: "❌",
        elite: "❌",
        master: "✅",
      },
      {
        title: "Live Price Entries",
        basic: "❌",
        pro: "❌",
        elite: "✅",
        master: "✅",
      },
    ];

    return featureTable.map((item) => ({
      title: item.title,
      value:
        planId === "master"
          ? item.master
          : planId === "elite"
          ? item.elite
          : planId === "pro"
          ? item.pro
          : item.basic,
    }));
  };

  // Format price display with savings calculation
  const getPriceDisplay = (plan, period) => {
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
      };
    } else {
      const monthlyPrice = plan.monthly?.usdt;
      const yearlyPrice = plan.yearly?.usdt;
      const yearlySavings = monthlyPrice
        ? Math.round(
            ((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100
          )
        : 0;

      return {
        price: period === "monthly" ? monthlyPrice : yearlyPrice,
        savings: period === "yearly" ? yearlySavings : 0,
        currency: "$", // <-- changed from "USDT" to "$"
      };
    }
  };

  // Continue button handler
  const handleContinue = (selectedPlanId) => {
    if (!selectedPlanId) return;

    const selectedPlan = plans.find((p) => p.planId === selectedPlanId);
    if (!selectedPlan) return;

    // Determine amount based on country
    const amount =
      userCountry === "IN"
        ? selectedPlan[billingPeriod]?.inr
        : selectedPlan[billingPeriod]?.usdt;

    // Auto-redirect if INR < 450
    if (userCountry === "IN" && amount < 450) {
      const query = new URLSearchParams({
        planName: selectedPlan.name,
        period: billingPeriod,
        method: "upi",
        amount: amount.toString(),
      }).toString();

      router.push(`/checkoutonline?${query}`);
      return;
    }

    // Otherwise show payment selector
    setShowPaymentSelector(true);

    // Optionally, store the selected plan in state for later use
    setActivePlan(selectedPlanId);
  };

  const handleBackClick = () => {
    router.push("/profile");
  };

  return (
    <div className="pricing-page flexClm gap_24">
      {/* Header Section */}

      <div className="flexRow gap_12">
        <button className="button_sec flexRow" onClick={handleBackClick}>
          <ArrowLeft size={20} />
        </button>
        <div className="flexClm">
          <span className="font_20">Choose plan</span>
          <span className="font_12">Pay with what suits you</span>
        </div>
      </div>

      {/* Billing Toggle */}
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
              className="flexRow flex_center gap_4 chart_boxBg success"
              style={{
                position: "absolute",
                top: "-32px",
                right: "0px",
                left: "0px",
                width: "150px",
                margin: "auto",
                padding: "12px",
              }}
            >
              <Percent size={12} />
              Save upto 50%
            </span>
          </button>
        </div>
      </motion.div>

      {/* Plans Grid */}
      <div className="flexClm gap_24">
        <AnimatePresence>
          {plans.map((plan, index) => {
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
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                onHoverStart={() => setIsHovered(plan.planId)}
                onHoverEnd={() => setIsHovered(null)}
                onClick={() => setActivePlan(plan.planId)}
              >
                {/* Plan Header */}
                <div className="flexRow flexRow_stretch width100">
                  <div className="flexRow gap_12 flex_center">
                    <div>{getPlanIcon(plan.planId)}</div>
                    <div className="flexClm">
                      <span className="font_20 font_weight_600">
                        {plan.name}
                      </span>
                      <span className="plan-description font_12">
                        {plan.planId === "pro" && "Perfect for serious traders"}
                        {plan.planId === "elite" && "For professional trading"}
                        {plan.planId === "master" &&
                          "Enterprise-grade solution"}
                      </span>
                    </div>
                  </div>

                  {/* Price Section */}
                  <div>
                    <div className="flexClm" style={{ alignItems: "end" }}>
                      <div>
                        <span>{priceInfo.currency}</span>
                        <span className="font_32 font_weight_600">
                          {priceInfo.price}
                        </span>
                      </div>
                      <span className="period font_12">
                        /{billingPeriod === "monthly" ? "month" : "year"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Show Details */}
                <div className="flexRow flexRow_stretch">
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
                      Save {priceInfo.savings}% annually
                    </div>
                  )}
                </div>

                {/* CTA Button */}
                <motion.button
                  className={`plan-cta ${isActive ? "active" : ""}`}
                  disabled={isCurrent}
                  onClick={(e) => {
                    e.stopPropagation(); // prevent card click from firing
                    handleContinue(plan.planId); // ✅ pass planId directly
                  }}
                >
                  {isCurrent ? "Current Plan" : "Get Started"} <Zap size={16} />
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
                      {[
                        ...features.filter(
                          (f) => !["✅", "❌"].includes(f.value)
                        ),
                        ...features.filter((f) => f.value === "✅"),
                        ...features.filter((f) => f.value === "❌"),
                      ].map((feature, idx) => (
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
                            <span>
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
            <span className="font_12">Cancel Anytime</span>
          </div>
          <div className="trust-item">
            <Users size={20} className="vector" />
            <span className="font_12">10,000+ Traders</span>
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
              userCountry === "IN"
                ? plans.find((p) => p.planId === activePlan)?.[billingPeriod]
                    ?.inr
                : plans.find((p) => p.planId === activePlan)?.[billingPeriod]
                    ?.usdt
            }
            allowUPI={true}
            onClose={() => setShowPaymentSelector(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default Pricing;
