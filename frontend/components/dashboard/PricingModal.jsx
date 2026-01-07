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
import Image from "next/image";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import PaddleLoader from "../../components/payments/PaddleLoader";

const monthlyPriceId = process.env.NEXT_PUBLIC_PADDLE_MONTHLY_PRICE_ID;
const yearlyPriceId = process.env.NEXT_PUBLIC_PADDLE_YEARLY_PRICE_ID;
const lifetimePriceId = process.env.NEXT_PUBLIC_PADDLE_LIFETIME_PRICE_ID;

export const getUserCurrency = () => {
  if (typeof window === "undefined") return "USD";

  const locale = navigator.language || "";
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";

  const isIndia =
    locale.toLowerCase().includes("in") ||
    timezone.toLowerCase().includes("kolkata");

  return isIndia ? "INR" : "USD";
};

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

const PLANS_CONFIG = {
  monthly: {
    title: "Pro Monthly",
    price: {
      USD: "$3.49",
      INR: "₹149",
    },
    amount: {
      USD: "3.49",
      INR: "149",
    },
    period: "/month",
    planName: "Pro",
    tagline: "Flexible monthly access",
    popular: false,
    paddlePriceId: monthlyPriceId,
  },

  yearly: {
    title: "Pro Yearly",
    price: {
      USD: "$29.99",
      INR: "₹1299",
    },
    amount: {
      USD: "29.99",
      INR: "1299",
    },
    period: "/year",
    planName: "Pro",
    tagline: "Most popular – Save 28%",
    popular: true,
    savings: "28%",
    paddlePriceId: yearlyPriceId,
  },

  lifetime: {
    title: "Lifetime",
    price: {
      USD: "$99",
      INR: "₹1999",
    },
    amount: {
      USD: "99",
      INR: "1999",
    },
    period: "one-time",
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
  const currency = getUserCurrency(); // "INR" or "USD"

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
            "🔄 Checkout closed – starting subscription verification..."
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
          }
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

  return (
    <>
      <PaddleLoader />

      {/* Hero Section */}
      <section className="pricing-hero">
        <div>
          {" "}
          <Image
            src="/assets/journalx_navbar.svg"
            alt="JournalX Logo"
            width={80}
            height={42}
            priority
          />
        </div>
        <div className="flexClm gap_4">
          <span className="font_32 font_weight_600">
            Upgrade to enjoy benefits
          </span>
          <span className="font_16 shade_50">Most affordable and trusted</span>
        </div>
        {/* <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="hero-content"
        >
          <div className="badge">
            <Sparkles size={14} />
            <span>TRUSTED BY 10,000+ TRADERS</span>
          </div>

          <h1 className="hero-title">
            Trade Smarter.
            <br />
            <span className="gradient-text">Invest in Your Edge</span>
          </h1>

          <p className="hero-subtitle">
            Professional tools that pay for themselves. Start free, upgrade when
            ready.
          </p>
        </motion.div> */}

        {/* Trust Indicators */}
        {/* <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flexRow gap_32 flex_center"
        >
          <div className="trust-item">
            <Shield size={16} className="text-success" />
            <span>Lowest pricing</span>
          </div>
          <div className="trust-item">
            <Lock size={16} className="text-success" />
            <span>Full data encrypted</span>
          </div>
          <div className="trust-item">
            <Check size={16} className="text-success" />
            <span>Cancel anytime</span>
          </div>
        </motion.div> */}
      </section>

      {/* Pricing Cards */}
      <section className="pricing-section">
        <div className="pricing-grid">
          {/* Free Plan */}
          <PricingCard
            plan="free"
            title="Free"
            price="$0"
            period="Forever free"
            features={PLANS_FEATURES.free}
            buttonText="Start Free"
            isCurrent={true}
            onHover={setHoveredPlan}
            isHovered={hoveredPlan === "free"}
          />

          {/* Monthly Plan */}
          <PricingCard
            plan="monthly"
            title="Monthly"
            price="$3.49"
            period="per month"
            features={PLANS_FEATURES.pro}
            buttonText="Get Monthly"
            highlight={false}
            onClick={() => handlePlanClick("monthly")}
            onHover={setHoveredPlan}
            isHovered={hoveredPlan === "monthly"}
          />

          {/* Yearly Plan (Most Popular) */}
          <PricingCard
            plan="yearly"
            title="Yearly"
            price="$29.99"
            period="per year"
            features={PLANS_FEATURES.pro}
            buttonText="Get Yearly"
            highlight={true}
            popular={true}
            savings="28%"
            onClick={() => handlePlanClick("yearly")}
            onHover={setHoveredPlan}
            isHovered={hoveredPlan === "yearly"}
          />

          {/* Lifetime Plan */}
          <PricingCard
            plan="lifetime"
            title="Lifetime"
            price="$99"
            period="one-time payment"
            features={PLANS_FEATURES.lifetime}
            buttonText="Get Lifetime"
            highlight={false}
            valueBadge="Best Value"
            onClick={() => handlePlanClick("lifetime")}
            onHover={setHoveredPlan}
            isHovered={hoveredPlan === "lifetime"}
          />
        </div>
      </section>

      {/* Payment Modal */}
      {isClient &&
        isModalOpen &&
        selectedPlan &&
        createPortal(
          <PaymentModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            planTitle={PLANS_CONFIG[selectedPlan].title}
            planPrice={PLANS_CONFIG[selectedPlan].price[currency]}
            currency={currency}
            onPaymentOptionClick={handlePaymentOptionClick}
          />,
          document.body
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
