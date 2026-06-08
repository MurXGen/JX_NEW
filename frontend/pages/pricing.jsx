// pages/pricing.js
import { motion } from "framer-motion";
import {
  Check,
  CreditCard,
  Crown,
  Lock,
  Shield,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import PaddleLoader from "../components/payments/PaddleLoader";
import { LandingNav, LandingFooter } from "@/components/landingPage/LandingChrome";

const monthlyPriceId = process.env.NEXT_PUBLIC_PADDLE_MONTHLY_PRICE_ID;
const yearlyPriceId = process.env.NEXT_PUBLIC_PADDLE_YEARLY_PRICE_ID;
const lifetimePriceId = process.env.NEXT_PUBLIC_PADDLE_LIFETIME_PRICE_ID;

const PLANS_FEATURES = {
  free: [
    { text: "10 trades/month" },
    { text: "Basic charts" },
    { text: "1 account" },
    { text: "30-day history" },
  ],
  pro: [
    { text: "Unlimited trades" },
    { text: "Advanced analytics" },
    { text: "3 accounts" },
    { text: "Full trade history" },
  ],
  lifetime: [
    { text: "Lifetime updates" },
    { text: "All Pro features" },
    { text: "Priority support" },
    { text: "Early beta access" },
  ],
};

const INR_PRICES = {
  monthly: {
    price: "₹299",
    amount: "299",
  },
  yearly: {
    price: "₹2,499",
    amount: "2499",
  },
  lifetime: {
    price: "₹7,999",
    amount: "7999",
  },
};

const getUserCurrency = () => {
  console.log("🌍 getUserCurrency called");

  if (typeof window === "undefined") {
    console.log("🟥 Running on server → defaulting to USD");
    return "USD";
  }

  const locale = navigator.language || "";
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";

  console.log("🟢 Running on client");
  console.log("🌐 Browser locale:", locale);
  console.log("⏰ Browser timezone:", timeZone);

  if (locale.startsWith("en-IN")) {
    console.log("🇮🇳 Detected India via locale");
    return "INR";
  }

  if (timeZone.includes("Asia/Calcutta")) {
    console.log("🇮🇳 Detected India via timezone");
    return "INR";
  }

  console.log("🌎 Defaulting to USD");
  return "USD";
};

const currency = getUserCurrency();

console.log("💱 Final detected currency:", currency);

export const PLANS_CONFIG = {
  free: {
    title: "Free",
    price: currency === "INR" ? "₹0" : "$0",
    amount: currency === "INR" ? "0" : "0",
    currency,
    period: "monthly",
    planName: "Pro",
    tagline: "Flexible monthly access",
    popular: false,
    paddlePriceId: monthlyPriceId,
  },
  monthly: {
    title: "Pro Monthly",
    price: currency === "INR" ? "₹149" : "$3.49",
    amount: currency === "INR" ? "3.49" : "3.49",
    currency,
    period: "monthly",
    planName: "Pro",
    tagline: "Flexible monthly access",
    popular: false,
    paddlePriceId: monthlyPriceId,
  },

  yearly: {
    title: "Pro Yearly",
    price: currency === "INR" ? "₹1,499" : "$29.99",
    amount: currency === "INR" ? "29.99" : "29.99",
    currency,
    period: "yearly",
    planName: "Pro",
    tagline: "Most popular • Save 28%",
    popular: true,
    savings: "28%",
    paddlePriceId: yearlyPriceId,
  },

  lifetime: {
    title: "Lifetime",
    price: currency === "INR" ? "₹7,999" : "$99",
    amount: currency === "INR" ? "99" : "99",
    currency,
    period: "lifetime",
    planName: "Lifetime",
    tagline: "One payment, forever access",
    popular: false,
    value: "Best value",
    paddlePriceId: lifetimePriceId,
  },
};

export default function Pricing() {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [hoveredPlan, setHoveredPlan] = useState(null);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const openPaddleCheckout = async (priceId) => {
    if (!window?.Paddle) {
      alert("Payment system is loading. Please wait a moment and try again.");
      return;
    }

    try {
      window.Paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        settings: { displayMode: "overlay" },

        // Not always reliable but keep it
        successCallback: () => {
          console.log("⚡ Payment successCallback triggered");
        },

        closeCallback: () => {
          console.log(
            "🔄 Checkout closed – starting subscription verification...",
          );
          startSubscriptionPolling();
        },
      });
    } catch (error) {
      console.error("Error opening Paddle checkout:", error);
      alert("Failed to open checkout. Please try again.");
    }
  };

  const startSubscriptionPolling = () => {
    let attempts = 0;
    const maxAttempts = 12; // try for 60 seconds

    const interval = setInterval(async () => {
      attempts++;

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auth/user-info`,
          {
            credentials: "include",
          },
        );

        const user = await res.json();

        console.log("🔍 Checking subscription:", user.subscriptionStatus);

        if (user.subscriptionStatus === "active") {
          clearInterval(interval);
          router.push("/dashboard");
        }
      } catch (err) {
        console.error("Polling error:", err);
      }

      if (attempts >= maxAttempts) {
        console.warn("⛔ Stopping polling – max attempts reached.");
        clearInterval(interval);
      }
    }, 5000); // every 5 seconds
  };

  const handlePlanClick = (planKey) => {
    setSelectedPlan(planKey);
    setIsModalOpen(true);
  };

  const handlePaymentOptionClick = (option) => {
    if (!selectedPlan) return;

    const planConfig = PLANS_CONFIG[selectedPlan];
    setIsModalOpen(false);

    switch (option) {
      case "cards_paypal":
        if (planConfig.paddlePriceId) {
          openPaddleCheckout(planConfig.paddlePriceId);
        }
        break;
      case "crypto":
        router.push({
          pathname: "/cryptobillingpage",
          query: {
            planName: planConfig.planName,
            period: planConfig.period,
            amount: planConfig.amount,
          },
        });
        break;
      // case "binance":
      //   router.push({
      //     pathname: "/payments/binance",
      //     query: {
      //       planName: planConfig.planName,
      //       period: planConfig.period,
      //       amount: planConfig.amount,
      //     },
      //   });
      //   break;
    }
  };

  const C = { text: "#fff", muted: "#aeb4bc", dim: "#707a8a", surface: "#161a20", border: "rgba(255,255,255,0.08)", yellow: "#fcd535", green: "#2ebd85" };
  const SITE_URL = "https://journalx.app";

  const CARDS = [
    { key: "free", title: "Free", price: PLANS_CONFIG.free.price, period: "forever", features: PLANS_FEATURES.free, cta: "Start free", current: true },
    { key: "monthly", title: "Pro Monthly", price: PLANS_CONFIG.monthly.price, period: "/ month", features: PLANS_FEATURES.pro, cta: "Get monthly" },
    { key: "yearly", title: "Pro Yearly", price: PLANS_CONFIG.yearly.price, period: "/ year", features: PLANS_FEATURES.pro, cta: "Get yearly", popular: true, badge: "Save 28%" },
    { key: "lifetime", title: "Lifetime", price: PLANS_CONFIG.lifetime.price, period: "once", features: PLANS_FEATURES.lifetime, cta: "Get lifetime", badge: "Best value" },
  ];

  const pricingLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "JournalX Pro",
    description: "JournalX trading journal — advanced analytics, unlimited trades, risk and psychology tracking.",
    brand: { "@type": "Brand", name: "JournalX" },
    offers: CARDS.filter((c) => c.key !== "free").map((c) => ({
      "@type": "Offer",
      name: c.title,
      price: PLANS_CONFIG[c.key].amount,
      priceCurrency: PLANS_CONFIG[c.key].currency,
      url: `${SITE_URL}/pricing`,
      availability: "https://schema.org/InStock",
    })),
  };

  return (
    <>
      <Head>
        <title>Pricing — JournalX | Start Free, Upgrade Anytime</title>
        <meta name="description" content="Simple, affordable pricing for the JournalX trading journal. Start free, then unlock unlimited trades and advanced analytics with Pro monthly, yearly, or lifetime plans." />
        <meta name="keywords" content="journalx pricing, trading journal price, trading journal subscription, trade tracker cost, best value trading journal" />
        <link rel="canonical" href={`${SITE_URL}/pricing`} />
        <meta name="robots" content="index, follow" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="JournalX Pricing — Start Free, Upgrade Anytime" />
        <meta property="og:description" content="Simple, affordable pricing for the JournalX trading journal. Start free; unlock advanced analytics with Pro." />
        <meta property="og:url" content={`${SITE_URL}/pricing`} />
        <meta property="og:image" content={`${SITE_URL}/assets/JournalX_Banner.png`} />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingLd) }} />
      </Head>

      <PaddleLoader />
      <LandingNav />

      <div style={{ background: "#0d1117", color: C.text, fontFamily: "Poppins, sans-serif", minHeight: "100vh" }}>
        {/* Hero */}
        <section style={{ maxWidth: 1160, margin: "0 auto", padding: "72px 20px 32px", textAlign: "center", position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(600px 320px at 50% -10%, rgba(252,213,53,0.16), transparent 70%)", pointerEvents: "none" }} />
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ position: "relative" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(252,213,53,0.12)", border: "1px solid rgba(252,213,53,0.3)", color: C.yellow, borderRadius: 999, padding: "6px 14px", font: "600 13px Poppins", marginBottom: 20 }}>
              <Sparkles size={14} /> Trusted by traders worldwide
            </span>
            <h1 style={{ font: "700 clamp(32px,5vw,52px)/1.1 Poppins", margin: "0 auto 14px", maxWidth: 640, letterSpacing: "-1.5px" }}>
              Invest in your <span style={{ color: C.yellow }}>edge</span>
            </h1>
            <p style={{ font: "400 clamp(16px,2vw,18px)/1.6 Poppins", color: C.muted, maxWidth: 520, margin: "0 auto" }}>
              Start free and upgrade when you're ready. Every plan pays for itself the first time it saves you from one bad habit.
            </p>
          </motion.div>
        </section>

        {/* Plans */}
        <section style={{ maxWidth: 1160, margin: "0 auto", padding: "0 20px 40px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 18, alignItems: "stretch" }}>
            {CARDS.map((c, i) => (
              <motion.div
                key={c.key}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                style={{
                  position: "relative", display: "flex", flexDirection: "column",
                  background: c.popular ? "linear-gradient(160deg, rgba(252,213,53,0.1), rgba(22,26,32,1))" : C.surface,
                  border: `1px solid ${c.popular ? "rgba(252,213,53,0.4)" : C.border}`,
                  borderRadius: 20, padding: 26,
                }}
              >
                {c.popular && (
                  <span style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", background: C.yellow, color: "#1e2329", font: "700 11px Poppins", padding: "4px 12px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <Crown size={12} /> MOST POPULAR
                  </span>
                )}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ font: "600 17px Poppins" }}>{c.title}</span>
                  {c.badge && !c.popular && (
                    <span style={{ background: "rgba(46,189,133,0.15)", color: C.green, font: "600 11px Poppins", padding: "3px 9px", borderRadius: 999 }}>{c.badge}</span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "10px 0 4px" }}>
                  <span style={{ font: "700 34px Poppins", letterSpacing: "-1px" }}>{c.price}</span>
                  <span style={{ font: "400 14px Poppins", color: C.dim }}>{c.period}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 11, margin: "20px 0 24px", flex: 1 }}>
                  {c.features.map((f) => (
                    <span key={f.text} style={{ display: "flex", alignItems: "center", gap: 9, font: "400 14px Poppins", color: C.muted }}>
                      <Check size={16} style={{ color: C.green, flexShrink: 0 }} /> {f.text}
                    </span>
                  ))}
                </div>
                <button
                  onClick={c.current ? undefined : () => handlePlanClick(c.key)}
                  disabled={c.current}
                  style={{
                    width: "100%", justifyContent: "center", display: "inline-flex", alignItems: "center", gap: 8,
                    borderRadius: 12, padding: "13px", cursor: c.current ? "default" : "pointer",
                    font: "600 14px Poppins", border: "none",
                    background: c.current ? "rgba(255,255,255,0.08)" : c.popular ? C.yellow : "rgba(255,255,255,0.1)",
                    color: c.current ? C.dim : c.popular ? "#1e2329" : "#fff",
                  }}
                >
                  {c.current ? <><Check size={15} /> Current plan</> : <><Zap size={15} /> {c.cta}</>}
                </button>
              </motion.div>
            ))}
          </div>

          {/* trust row */}
          <div style={{ display: "flex", justifyContent: "center", gap: 28, flexWrap: "wrap", marginTop: 36, font: "400 13px Poppins", color: C.dim }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Shield size={15} style={{ color: C.green }} /> 256-bit encrypted</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Lock size={15} style={{ color: C.green }} /> Cancel anytime</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><CreditCard size={15} style={{ color: C.green }} /> Cards, PayPal & crypto</span>
          </div>
        </section>

        <LandingFooter />
      </div>

      {/* Payment Modal */}
      {isClient &&
        isModalOpen &&
        selectedPlan &&
        createPortal(
          <PaymentModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            planTitle={PLANS_CONFIG[selectedPlan]?.title || ""}
            planPrice={PLANS_CONFIG[selectedPlan]?.price || ""}
            onPaymentOptionClick={handlePaymentOptionClick}
          />,
          document.body,
        )}
    </>
  );
}

function PricingCard({
  plan,
  title,
  price,
  period,
  features,
  buttonText,
  isCurrent = false,
  highlight = false,
  popular = false,
  savings,
  valueBadge,
  onClick,
  onHover,
  isHovered,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -10, transition: { duration: 0.2 } }}
      onMouseEnter={() => onHover(plan)}
      onMouseLeave={() => onHover(null)}
      className={`pricing-card ${highlight ? "highlight" : ""} ${isHovered ? "hovered" : ""}`}
    >
      <div className="card-header">
        <div className="flexRow flexRow_stretch">
          <span className="card-title">{title}</span>
          {popular && (
            <div className="popular-badge">
              <Crown size={14} />
              <span>MOST POPULAR</span>
            </div>
          )}

          {valueBadge && (
            <div className="value-badge">
              <TrendingUp size={14} />
              <span>{valueBadge}</span>
            </div>
          )}

          {savings && (
            <div className="savings-badge">
              <span>Save {savings}</span>
            </div>
          )}
        </div>

        <div className="card-price flexRow flexRow_stretch">
          <span className="price">{price}</span>
          <span className="period">{period}</span>
        </div>
      </div>

      <span className="feature-list">
        {features.map((feature, index) => (
          <motion.span
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="feature-item"
          >
            <Check size={16} className="feature-icon" />
            <span className="feature-text">{feature.text}</span>
          </motion.span>
        ))}
      </span>

      <motion.button
        className={`pricing-button ${isCurrent ? "current" : ""}`}
        onClick={isCurrent ? null : onClick}
        whileHover={{ scale: isCurrent ? 1 : 1.05 }}
        whileTap={{ scale: isCurrent ? 1 : 0.95 }}
        disabled={isCurrent}
      >
        {isCurrent ? (
          <>
            <Check size={16} />
            <span>Current Plan</span>
          </>
        ) : (
          <>
            <Zap size={16} />
            <span>{buttonText}</span>
          </>
        )}
      </motion.button>
    </motion.div>
  );
}

function PaymentModal({
  isOpen,
  onClose,
  planTitle,
  planPrice,
  onPaymentOptionClick,
}) {
  if (!isOpen) return null;

  const paymentOptions = [
    {
      id: "cards_paypal",
      title: "Cards & PayPal",
      description: "Secure payment via Visa, Mastercard, Amex, or PayPal",
      icon: <CreditCard size={24} />,
      gradient: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
    },
    {
      id: "crypto",
      title: "Crypto Payment",
      description: "Pay with USDT, Bitcoin, Ethereum on multiple networks",
      icon: "₿",
      gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    },
    // {
    //   id: "binance",
    //   title: "Binance Pay",
    //   description: "Instant payment directly from your Binance account",
    //   icon: "⚡",
    //   gradient: "linear-gradient(135deg, #f0b90b 0%, #c27803 100%)",
    // },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="payment-modal-overlay"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 25 }}
        className="payment-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Content Side (Left) */}
        <div className="modal-content-side">
          <div className="modal-header">
            <button className="modal-close" onClick={onClose}>
              ×
            </button>
            <h2 className="modal-title">Complete Your Purchase</h2>
            <p className="modal-subtitle">
              Select your preferred payment method
            </p>
          </div>

          <div className="selected-plan-info">
            <div className="plan-badge">
              <span>{planTitle}</span>
            </div>
            <div className="plan-price-display">
              <span className="price">{planPrice}</span>
              <span className="plan-period">One-time payment</span>
            </div>
          </div>

          <div className="payment-options">
            {paymentOptions.map((option, index) => (
              <motion.button
                key={option.id}
                className="button_sec payment-option-button"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onPaymentOptionClick(option.id)}
                style={{
                  background: option.gradient,
                  color: "white",
                  border: "none",
                }}
              >
                <div className="payment-option-content">
                  <span className="payment-icon">{option.icon}</span>
                  <div className="payment-info">
                    <span className="payment-title">{option.title}</span>
                    <span className="payment-desc">{option.description}</span>
                  </div>
                </div>
                <span className="payment-arrow">→</span>
              </motion.button>
            ))}
          </div>

          <div className="security-notice">
            <Shield size={16} />
            <span>Secure payment · 256-bit encryption</span>
          </div>
        </div>

        {/* Image Side (Right) */}
        <div className="modal-image-side">
          <div className="">
            <div className="pad_16">
              <h3>Unlock Your Trading Potential</h3>
              <p>Join 10,000+ traders who trust JournalX</p>
              <div className="benefits-list">
                <span>
                  <Check size={14} /> Advanced analytics
                </span>
                <span>
                  <Check size={14} /> Unlimited trade logging
                </span>
                <span>
                  <Check size={14} /> Priority support
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
