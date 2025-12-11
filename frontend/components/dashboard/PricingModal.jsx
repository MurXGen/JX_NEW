// pages/pricing.js
import { motion, AnimatePresence } from "framer-motion";
import PaddleLoader from "../../components/payments/PaddleLoader";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/router";
import Image from "next/image";
import { Check, Crown, Sparkles, TrendingUp, Zap } from "lucide-react";

const monthlyPriceId = process.env.NEXT_PUBLIC_PADDLE_MONTHLY_PRICE_ID;
const yearlyPriceId = process.env.NEXT_PUBLIC_PADDLE_YEARLY_PRICE_ID;
const lifetimePriceId = process.env.NEXT_PUBLIC_PADDLE_LIFETIME_PRICE_ID;

// Only 4 most important features per plan (UX research shows 4 is optimal for decision making)
const PLANS_FEATURES = {
  free: [
    { text: "10 trades/month", icon: "📊" },
    { text: "Basic charts", icon: "📈" },
    { text: "1 account", icon: "👤" },
    { text: "30-day history", icon: "⏰" },
  ],
  pro: [
    { text: "Unlimited trades", icon: "♾️" },
    { text: "Advanced analytics", icon: "📊" },
    { text: "3 accounts", icon: "👥" },
    { text: "Full trade history", icon: "📚" },
  ],
  lifetime: [
    { text: "Lifetime updates", icon: "⚡" },
    { text: "All Pro features", icon: "🏆" },
    { text: "Priority support", icon: "⭐" },
    { text: "Early beta access", icon: "🚀" },
  ],
};

const PLANS_CONFIG = {
  monthly: {
    title: "Pro Monthly",
    price: "$3.49",
    amount: "3.49",
    period: "monthly",
    planName: "Pro",
    tagline: "Flexible monthly access",
    popular: false,
  },
  yearly: {
    title: "Pro Yearly",
    price: "$29.99",
    amount: "29.99",
    period: "yearly",
    planName: "Pro",
    tagline: "Most popular - Save 28%",
    popular: true,
    savings: "28%",
  },
  lifetime: {
    title: "Lifetime",
    price: "$99",
    amount: "99",
    period: "lifetime",
    planName: "Lifetime",
    tagline: "One payment, forever access",
    popular: false,
    value: "Best value",
  },
};

const paymentOptions = [
  {
    id: "cards_paypal",
    title: "Cards & PayPal",
    description: "Secure payment via Visa, Mastercard, Amex, or PayPal",
    icon: "💳",
    color: "#3b82f6",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
  {
    id: "crypto",
    title: "Crypto",
    description: "Pay with USDT, Bitcoin, Ethereum on multiple networks",
    icon: "₿",
    color: "#f59e0b",
    gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
  },
  {
    id: "binance",
    title: "Binance Pay",
    description: "Instant payment directly from your Binance account",
    icon: "⚡",
    color: "#f0b90b",
    gradient: "linear-gradient(135deg, #f0b90b 0%, #c27803 100%)",
  },
];

export default function Pricing() {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [hoveredPlan, setHoveredPlan] = useState(null);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Debug function to check if modal should open
  const handlePlanClick = (planKey) => {
    console.log("Plan clicked:", planKey);
    console.log("PLANS_CONFIG[planKey]:", PLANS_CONFIG[planKey]);
    setSelectedPlan(planKey);
    setIsModalOpen(true);
    console.log("Modal should open, isModalOpen will be:", true);
  };

  const openCheckout = (priceId) => {
    if (!window?.Paddle) {
      alert("Payment system loading... Please try again in a moment.");
      return;
    }

    window.Paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: { email: "" }, // Will be filled by Paddle
      settings: { displayMode: "overlay" },
    });
  };

  const handlePaymentOptionClick = (option) => {
    console.log("Payment option clicked:", option);
    if (!selectedPlan) {
      console.error("No selected plan!");
      return;
    }

    const planConfig = PLANS_CONFIG[selectedPlan];
    console.log("Plan config for payment:", planConfig);

    setIsModalOpen(false); // Close modal first

    switch (option) {
      case "cards_paypal":
        const priceId = getPriceIdForPlan(selectedPlan);
        console.log("Price ID:", priceId);
        if (priceId) {
          openCheckout(priceId);
        } else {
          alert("Payment system not available for this plan.");
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
      case "binance":
        router.push({
          pathname: "/payments/binance",
          query: {
            planName: planConfig.planName,
            period: planConfig.period,
            amount: planConfig.amount,
          },
        });
        break;
      default:
        console.error("Unknown payment option:", option);
    }
  };

  const getPriceIdForPlan = (planKey) => {
    switch (planKey) {
      case "monthly":
        return monthlyPriceId;
      case "yearly":
        return yearlyPriceId;
      case "lifetime":
        return lifetimePriceId;
      default:
        return null;
    }
  };

  return (
    <>
      <PaddleLoader />

      {/* Hero Section */}
      <section className="pricing-hero">
        <motion.div
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
        </motion.div>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flexRow gap_32"
        >
          <div className="trust-item">
            <Check size={16} className="text-success" />
            <span>30-day money back guarantee</span>
          </div>
          <div className="trust-item">
            <Check size={16} className="text-success" />
            <span>Bank-level security</span>
          </div>
          <div className="trust-item">
            <Check size={16} className="text-success" />
            <span>Cancel anytime</span>
          </div>
        </motion.div>
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
            onClick={() => console.log("Free plan clicked (disabled)")}
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

        {/* FAQ Section */}
        {/* <div className="faq-section">
          <h3 className="faq-title">Frequently Asked Questions</h3>
          <div className="faq-grid">
            <div className="faq-item">
              <h4>Can I switch plans later?</h4>
              <p>
                Yes! You can upgrade or downgrade at any time. You'll only pay
                the difference when upgrading.
              </p>
            </div>
            <div className="faq-item">
              <h4>Is there a free trial for paid plans?</h4>
              <p>
                The Free plan is our trial. No credit card required to start
                using all basic features.
              </p>
            </div>
            <div className="faq-item">
              <h4>What payment methods do you accept?</h4>
              <p>
                Credit/debit cards, PayPal, cryptocurrency (USDT, BTC, ETH), and
                Binance Pay.
              </p>
            </div>
            <div className="faq-item">
              <h4>Can I cancel anytime?</h4>
              <p>
                Absolutely. Cancel your subscription anytime, no questions
                asked.
              </p>
            </div>
          </div>
        </div> */}
      </section>

      {/* Payment Modal */}
      <AnimatePresence>
        {isClient && isModalOpen && selectedPlan && (
          <PaymentModal
            isOpen={isModalOpen}
            onClose={() => {
              console.log("Closing modal");
              setIsModalOpen(false);
            }}
            planTitle={PLANS_CONFIG[selectedPlan]?.title || ""}
            planPrice={PLANS_CONFIG[selectedPlan]?.price || ""}
            onPaymentOptionClick={handlePaymentOptionClick}
            paymentOptions={paymentOptions}
          />
        )}
      </AnimatePresence>
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
  // Add click handler logging
  const handleClick = () => {
    console.log(`PricingCard ${plan} clicked, onClick prop:`, onClick);
    if (onClick && !isCurrent) {
      onClick();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -10, transition: { duration: 0.2 } }}
      onMouseEnter={() => onHover && onHover(plan)}
      onMouseLeave={() => onHover && onHover(null)}
      className={`pricing-card ${highlight ? "highlight" : ""} ${isHovered ? "hovered" : ""}`}
    >
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

      <div className="card-header">
        <h3 className="card-title">{title}</h3>
        <div className="card-price">
          <span className="price">{price}</span>
          <span className="period">{period}</span>
        </div>
      </div>

      <ul className="feature-list">
        {features.map((feature, index) => (
          <motion.li
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="feature-item"
          >
            <span className="feature-icon">{feature.icon}</span>
            <span className="feature-text">{feature.text}</span>
          </motion.li>
        ))}
      </ul>

      <motion.button
        className={`pricing-button ${isCurrent ? "current" : ""}`}
        onClick={handleClick}
        whileHover={{ scale: isCurrent ? 1 : 1.05 }}
        whileTap={{ scale: isCurrent ? 1 : 0.95 }}
        disabled={isCurrent}
        style={{ cursor: isCurrent ? "default" : "pointer" }}
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
  paymentOptions,
}) {
  const [isVisible, setIsVisible] = useState(isOpen);

  useEffect(() => {
    setIsVisible(isOpen);
  }, [isOpen]);

  if (!isVisible) return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="payment-modal-overlay"
      onClick={onClose}
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", damping: 25 }}
        className="payment-modal"
        onClick={(e) => {
          e.stopPropagation();
          console.log("Modal content clicked");
        }}
        style={{
          position: "relative",
          zIndex: 1001,
        }}
      >
        {/* Modal Content Side */}
        <div className="modal-content-side">
          <div className="modal-header">
            <button
              className="modal-close"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              style={{ cursor: "pointer" }}
            >
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
                onClick={(e) => {
                  e.stopPropagation();
                  console.log("Payment option clicked:", option.id);
                  onPaymentOptionClick(option.id);
                }}
                style={{
                  background: option.gradient,
                  color: "white",
                  border: "none",
                  cursor: "pointer",
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
            <Check size={16} />
            <span>Secure payment · 256-bit encryption · No card storage</span>
          </div>
        </div>

        {/* Image Side */}
        <div className="modal-image-side">
          <div className="image-container">
            {/* Replace with your actual image */}
            <div
              style={{
                width: "100%",
                height: "100%",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "24px",
                fontWeight: "bold",
              }}
            >
              <div style={{ textAlign: "center", padding: "20px" }}>
                <div style={{ fontSize: "48px", marginBottom: "20px" }}>🎯</div>
                <div>Upgrade Your Trading Experience</div>
              </div>
            </div>
            {/* Uncomment when you have the image */}
            {/* <Image
              src="/journalx_banner.svg"
              alt="JournalX Premium Features"
              fill
              priority
              style={{ objectFit: "contain" }}
            /> */}
          </div>
          <div className="image-overlay">
            <h3>Unlock Your Trading Potential</h3>
            <p>
              Join 10,000+ traders who trust JournalX for their trading journey
            </p>
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
      </motion.div>
    </motion.div>,
    document.body
  );
}
