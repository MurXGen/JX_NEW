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
import Head from "next/head";

function Pricing() {
  const router = useRouter();
  const [billingPeriod, setBillingPeriod] = useState("monthly");
  const [userCountry, setUserCountry] = useState("OTHER");
  const [plans, setPlans] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);
  const [isHovered, setIsHovered] = useState(null);
  const [currentPlanId, setCurrentPlanId] = useState(null);
  const [expandedPlan, setExpandedPlan] = useState(null);
  const userHasPlan = !!currentPlanId; // true if user has any plan
  const userHasActivePlan = currentPlanId && currentPlanId.planId !== "free";
  const [selectedPlanId, setSelectedPlanId] = useState(null);

  const toggleDetails = (planId) => {
    setExpandedPlan((prev) => (prev === planId ? null : planId));
  };

  // Set predefined plans with new structure
  useEffect(() => {
    const staticPlans = [
      {
        name: "Free",
        planId: "free",
        description: "Basic journaling tools",
        monthly: { inr: 0, inrusdt: 0, usdt: 0 },
        yearly: { inr: 0, inrusdt: 0, usdt: 0 },
        lifetime: null,
      },
      {
        name: "Pro",
        planId: "pro",
        description: "Advanced insights",
        monthly: { inr: 149, inrusdt: 2, usdt: 5 },
        yearly: { inr: 1499, inrusdt: 19, usdt: 50 },
        lifetime: null,
      },
      {
        name: "Master",
        planId: "master",
        description: "Lifetime access",
        monthly: null,
        yearly: null,
        lifetime: { inr: 9999, inrusdt: 99, usdt: 119 },
      },
    ];

    setPlans(staticPlans);
  }, []);

  // ✅ 2. Load user's current plan from IndexedDB
  useEffect(() => {
    (async () => {
      const userData = await getFromIndexedDB("user-data");
      const subscription = userData?.subscription;

      if (!subscription) return;

      const planId = subscription.planId || null;
      const expiry = subscription.expiryDate || null;

      // Check if expired
      const isExpired = expiry ? new Date(expiry).getTime() < Date.now() : true;

      if (!planId || isExpired) {
        // ❌ Do NOT set active plan if expired
        setCurrentPlanId(null);
        setActivePlan(null);
        return;
      }

      // Normalize plan id (e.g., PRO001 → pro)
      const normalizedPlan = planId.toLowerCase().includes("pro")
        ? "pro"
        : planId.toLowerCase().includes("master")
          ? "master"
          : null;

      setCurrentPlanId(normalizedPlan);
      setActivePlan(normalizedPlan);
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
        pro: "✅",
        master: "✅ Generate share links",
      },
      // {
      //   title: "AI Analysis",
      //   free: "❌",
      //   pro: "✅ AI trade insights",
      //   master: "✅ AI trade insights",
      // },
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
    if (plan.planId === "master") {
      // Master plan only has lifetime
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

    // Pro plan - monthly/yearly pricing
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
  const handleContinue = (selectedPlanId, selectedBillingPeriod = null) => {
    if (!selectedPlanId) return;

    const selectedPlan = plans.find((p) => p.planId === selectedPlanId);
    if (!selectedPlan) return;

    // Use provided billing period or fallback to state
    const finalBillingPeriod = selectedBillingPeriod || billingPeriod;

    // Determine currency and amount based on user location and billing period
    let amount;
    if (finalBillingPeriod === "lifetime") {
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
        amount = selectedPlan[finalBillingPeriod]?.inr;
      } else {
        amount =
          userCountry === "INUSDT"
            ? selectedPlan[finalBillingPeriod]?.inrusdt
            : selectedPlan[finalBillingPeriod]?.usdt;
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
        period: finalBillingPeriod,
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

  return (
    <>
      <Head>
        {/* === Primary SEO Tags === */}
        <title>
          JournalX Pricing | Affordable Trading Journal Plans for Smart Traders
        </title>
        <meta
          name="description"
          content="Get the best value trading journal plans at unbeatable prices. JournalX offers flexible pricing — $5/month, $50/year, or lifetime access for just $99. Start journaling smarter with premium support included."
        />
        <meta
          name="keywords"
          content="trading journal pricing, affordable trading journal, cheap trading journal, lifetime trading journal, JournalX plans, forex journal pricing, stock trading app subscription"
        />
        <meta name="author" content="JournalX" />
        <meta
          name="robots"
          content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#020202" />

        {/* === Open Graph / Facebook === */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="JournalX" />
        <meta property="og:url" content="https://journalx.app/pricing" />
        <meta
          property="og:title"
          content="JournalX Pricing — Simple, Transparent & Affordable"
        />
        <meta
          property="og:description"
          content="Unlock the full power of JournalX for just $5/month, $50/year, or lifetime access at $99. Smarter trading, unmatched value, and 24/7 support for traders."
        />
        <meta
          property="og:image"
          content="https://journalx.app/assets/Journalx_Pricing_Banner.png"
        />
        <meta
          property="og:image:alt"
          content="JournalX Pricing Plans Comparison — Monthly, Yearly, Lifetime"
        />

        {/* === Twitter === */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@journalxapp" />
        <meta name="twitter:creator" content="@journalxapp" />
        <meta name="twitter:url" content="https://journalx.app/pricing" />
        <meta
          name="twitter:title"
          content="JournalX Pricing — Smarter Trading, Affordable Plans"
        />
        <meta
          name="twitter:description"
          content="Choose your plan: $5/month, $50/year, or $99 lifetime. JournalX delivers premium features, full analytics, and dedicated trader support."
        />
        <meta
          name="twitter:image"
          content="https://cdn.journalx.app/trades/open-images/1762951221225-Journalx_pricing_plan.png"
        />

        {/* === Canonical Link === */}
        <link rel="canonical" href="https://journalx.app/pricing" />

        {/* === Schema: Product Pricing === */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              name: "JournalX Trading Journal",
              image:
                "https://cdn.journalx.app/trades/open-images/1762951221225-Journalx_pricing_plan.png",
              description:
                "Affordable and powerful trading journal app with $5/month, $50/year, and lifetime $99 plans. Trusted by traders worldwide for performance tracking and analysis.",
              brand: {
                "@type": "Brand",
                name: "JournalX",
              },
              offers: [
                {
                  "@type": "Offer",
                  url: "https://journalx.app/pricing",
                  price: "5.00",
                  priceCurrency: "USD",
                  priceValidUntil: "2026-12-31",
                  availability: "https://schema.org/InStock",
                  category: "Monthly Plan",
                },
                {
                  "@type": "Offer",
                  url: "https://journalx.app/pricing",
                  price: "50.00",
                  priceCurrency: "USD",
                  priceValidUntil: "2026-12-31",
                  availability: "https://schema.org/InStock",
                  category: "Yearly Plan",
                },
                {
                  "@type": "Offer",
                  url: "https://journalx.app/pricing",
                  price: "99.00",
                  priceCurrency: "USD",
                  priceValidUntil: "2026-12-31",
                  availability: "https://schema.org/InStock",
                  category: "Lifetime Access",
                },
              ],
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.9",
                reviewCount: "320",
              },
            }),
          }}
        />
      </Head>

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

        {/* Plans Grid - Show all plans at once */}
        <div
          className="gridContainer_pricing pad_32"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "12px",
          }}
        >
          <AnimatePresence>
            {plans.map((plan, index) => {
              const isCurrent = currentPlanId === plan.planId;
              const features = getPlanFeatures(plan.planId);
              const isExpanded = expandedPlan === plan.planId;
              const isProPlan = plan.planId === "pro";

              return (
                <motion.div
                  key={plan.planId}
                  className={`chart_boxBg pad_16 flexClm gap_24 ${
                    isCurrent ? "active" : ""
                  } ${plan.planId}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{
                    scale: 1.02,
                    transition: { duration: 0.2 },
                  }}
                  onHoverStart={() => setIsHovered(plan.planId)}
                  onHoverEnd={() => setIsHovered(null)}
                  style={{
                    transform: "scale(0.9)", // ✅ makes the whole card smaller
                    transformOrigin: "center", // ✅ ensures it scales from the middle
                  }}
                  onClick={() => setSelectedPlanId(plan.planId)}
                >
                  {/* Plan Header */}
                  <div className="flexClm gap_32 width100">
                    <div className="flexRow flexRow_stretch">
                      <div className="flexRow gap_12">
                        <div>{getPlanIcon(plan.planId)}</div>
                        <div className="flexClm">
                          <span className="font_20 font_weight_600">
                            {plan.name}
                          </span>
                          <span className="plan-description font_12 shade_50">
                            {plan.description}
                          </span>
                        </div>
                      </div>
                      {/* Current Plan Badge */}
                      {isCurrent && (
                        <div
                          className="upgrade_btn"
                          style={{
                            position: "absolute",
                            top: "24px",
                            right: "24px",
                            maxWidth: "fit-content",
                          }}
                        >
                          Current Plan
                        </div>
                      )}
                    </div>

                    {/* Price Section */}
                    <div className="flexRow flexRow_stretch">
                      <div className="flexClm gap_4">
                        <div style={{ fontSize: "32px", lineHeight: "1" }}>
                          <span>
                            {
                              getPriceDisplay(
                                plan,
                                isProPlan ? billingPeriod : "lifetime"
                              ).currency
                            }
                          </span>
                          <span className="font_weight_600">
                            {
                              getPriceDisplay(
                                plan,
                                isProPlan ? billingPeriod : "lifetime"
                              ).price
                            }
                          </span>
                        </div>
                        <span className="period font_12 shade_50">
                          {isProPlan
                            ? billingPeriod === "monthly"
                              ? "per month"
                              : "per year"
                            : "one-time payment"}
                        </span>

                        {/* Savings Badge */}
                        {/* {getPriceDisplay(
                        plan,
                        isProPlan ? billingPeriod : "lifetime"
                      ).savings > 0 && (
                        <div
                          className="success font_12"
                          style={{
                            background: "rgba(16, 185, 129, 0.1)",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            width: "fit-content",
                          }}
                        >
                          Save{" "}
                          {
                            getPriceDisplay(
                              plan,
                              isProPlan ? billingPeriod : "lifetime"
                            ).savings
                          }
                          %
                        </div>
                      )} */}
                      </div>
                      {/* Pro Plan - Billing Toggle */}
                      {isProPlan && (
                        <div className="flexRow gap_8">
                          <button
                            className={`font_12 ${
                              billingPeriod === "monthly"
                                ? "button_ter selected active"
                                : "button_ter"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setBillingPeriod("monthly");
                            }}
                            style={{
                              width: "100px",
                            }}
                          >
                            Monthly
                          </button>
                          <button
                            className={`font_12 ${
                              billingPeriod === "yearly"
                                ? "button_ter selected active"
                                : "button_ter"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setBillingPeriod("yearly");
                            }}
                            style={{
                              position: "relative",
                              width: "100px",
                            }}
                          >
                            Yearly
                            <span
                              className="success font_10 successBg"
                              style={{
                                position: "absolute",
                                top: "-12px",
                                right: "15px",
                                background: "var(--success)",
                                color: "white",
                                padding: "2px 4px",
                                borderRadius: "4px",
                              }}
                            >
                              Save 17%
                            </span>
                          </button>
                        </div>
                      )}
                    </div>

                    <motion.button
                      className={`flexRow gap_8 flex_center ${
                        selectedPlanId === plan.planId // when the card is clicked
                          ? "button_pri"
                          : isProPlan
                            ? "button_pri"
                            : "button_sec"
                      }`}
                      disabled={
                        isCurrent ||
                        (plan.planId === "free" && userHasActivePlan)
                      }
                      whileHover={
                        !isCurrent &&
                        !(plan.planId === "free" && userHasActivePlan)
                          ? { scale: 1.02 }
                          : {}
                      }
                      whileTap={
                        !isCurrent &&
                        !(plan.planId === "free" && userHasActivePlan)
                          ? { scale: 0.98 }
                          : {}
                      }
                      onClick={(e) => {
                        e.stopPropagation();

                        // 🧩 Case 1: No user plan (not logged in)
                        if (!userHasPlan && plan.planId === "free") {
                          window.location.href = "/login";
                          return;
                        }

                        // 🧩 Case 2: Allow upgrade/downgrade
                        if (
                          !isCurrent &&
                          !(plan.planId === "free" && userHasActivePlan)
                        ) {
                          handleContinue(
                            plan.planId,
                            isProPlan ? billingPeriod : "lifetime"
                          );
                        }
                      }}
                      style={{
                        opacity:
                          isCurrent ||
                          (plan.planId === "free" && userHasActivePlan)
                            ? 0.6
                            : 1,
                        cursor:
                          isCurrent ||
                          (plan.planId === "free" && userHasActivePlan)
                            ? "not-allowed"
                            : "pointer",
                        minHeight: "44px",
                      }}
                    >
                      {isCurrent
                        ? "Current Plan"
                        : !userHasPlan && plan.planId === "free"
                          ? "Start Free"
                          : plan.planId === "free" && userHasActivePlan
                            ? "Upgraded"
                            : isProPlan
                              ? `Get ${
                                  billingPeriod === "monthly"
                                    ? "Monthly"
                                    : "Yearly"
                                } Access`
                              : "Get Lifetime Access"}
                      <Zap size={16} />
                    </motion.button>
                  </div>

                  {/* Plan Details Toggle */}
                  {/* <div className="flexRow flex_center">
                  <button
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
                  </button>
                </div> */}

                  {/* Plan Features */}
                  <AnimatePresence>
                    <motion.div
                      key="features"
                      className="flexClm gap_24"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <div className="font_12 font_weight_600 shade_50">
                        FEATURES INCLUDED:
                      </div>
                      {features.map((feature, idx) => (
                        <motion.div
                          key={idx}
                          className="flexRow flexRow_stretch"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.2, delay: idx * 0.03 }}
                        >
                          {feature.value !== "✅" && feature.value !== "❌" && (
                            <div className="flexRow gap_12 width100">
                              <span className="font_12">
                                <strong>{feature.title}:</strong>
                              </span>
                              <span
                                className="font_12"
                                style={{ textAlign: "right", flex: 1 }}
                              >
                                {feature.value}
                              </span>
                            </div>
                          )}
                          {(feature.value === "✅" ||
                            feature.value === "❌") && (
                            <span className="font_12">{feature.title}</span>
                          )}

                          {feature.value === "✅" && (
                            <Check size={16} className="success" />
                          )}
                          {feature.value === "❌" && (
                            <X size={16} className="error" />
                          )}
                        </motion.div>
                      ))}
                    </motion.div>
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
    </>
  );
}

export default Pricing;
