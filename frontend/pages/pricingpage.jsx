// pages/pricing.js
import { motion } from "framer-motion";
import PaddleLoader from "../components/payments/PaddleLoader";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/router";

const monthlyPriceId = process.env.NEXT_PUBLIC_PADDLE_MONTHLY_PRICE_ID;
const yearlyPriceId = process.env.NEXT_PUBLIC_PADDLE_YEARLY_PRICE_ID;
const lifetimePriceId = process.env.NEXT_PUBLIC_PADDLE_LIFETIME_PRICE_ID;

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

// Plan configuration with prices
const PLANS_CONFIG = {
  monthly: {
    title: "Pro Monthly",
    price: "$3.49",
    amount: "3.49",
    period: "monthly",
    planName: "Pro",
  },
  yearly: {
    title: "Pro Yearly",
    price: "$29.99",
    amount: "29.99",
    period: "yearly",
    planName: "Pro",
  },
  lifetime: {
    title: "Lifetime Access",
    price: "$99",
    amount: "99",
    period: "lifetime",
    planName: "Lifetime",
  },
};

export default function Pricing() {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const openCheckout = (priceId) => {
    if (!window?.Paddle) return alert("Payment system not ready yet.");

    window.Paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: {
        email: "murthy@gmail.com", // required by Paddle
      },
      customData: {
        userId: "69183823d927cbccec3a2c13", // used by YOUR webhook
      },
      settings: { displayMode: "overlay" },
    });
  };

  const handlePlanClick = (planKey) => {
    setSelectedPlan(planKey);
    setShowPaymentOptions(true);
    setIsModalOpen(true);
  };

  const handlePaymentOptionClick = (option) => {
    setIsModalOpen(false);

    if (!selectedPlan) return;

    const planConfig = PLANS_CONFIG[selectedPlan];

    switch (option) {
      case "cards_paypal":
        const priceId = getPriceIdForPlan(selectedPlan);
        if (priceId) {
          openCheckout(priceId);
        }
        break;
      case "crypto":
        // Redirect to crypto payment page with plan details
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
        // Redirect to Binance Pay with plan details
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
        break;
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

  const getPlanTitle = (planKey) => {
    if (!planKey) return "";
    const plan = PLANS_CONFIG[planKey];
    return plan ? `${plan.title} (${plan.price})` : "";
  };

  return (
    <>
      <PaddleLoader />
      <section className="pricing-page">
        <motion.h1
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="pricing-title"
        >
          Choose Your Plan
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="pricing-sub"
        >
          Fair pricing, premium features, built for traders who want to grow.
        </motion.p>

        {/* ---------------- PRICING CARDS ---------------- */}
        <div className="pricing-grid">
          {/* FREE */}
          <PricingCard
            type="free"
            title="Free"
            price="$0"
            subtitle="Forever"
            buttonText="Current Plan"
            disabled={true}
            features={getPlanFeatures("free")}
          />

          {/* PRO MONTHLY */}
          <PricingCard
            type="pro"
            title="Pro Monthly"
            price="$3.49"
            subtitle="/month"
            buttonText="Buy Monthly"
            onClick={() => handlePlanClick("monthly")}
            features={getPlanFeatures("pro")}
            highlight={false}
          />

          {/* PRO YEARLY */}
          <PricingCard
            type="pro"
            title="Pro Yearly"
            price="$29.99"
            subtitle="/year"
            buttonText="Buy Yearly"
            onClick={() => handlePlanClick("yearly")}
            features={getPlanFeatures("pro")}
            highlight={true} // ⭐ Best value
          />

          {/* LIFETIME */}
          <PricingCard
            type="lifetime"
            title="Lifetime Access"
            price="$99"
            subtitle="One-time payment"
            buttonText="Buy Lifetime"
            onClick={() => handlePlanClick("lifetime")}
            features={getPlanFeatures("lifetime")} // master renamed → lifetime
          />
        </div>
      </section>

      {/* Payment Options Modal */}
      {isClient &&
        isModalOpen &&
        createPortal(
          <PaymentModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            planTitle={getPlanTitle(selectedPlan)}
            onPaymentOptionClick={handlePaymentOptionClick}
          />,
          document.body
        )}
    </>
  );
}

function PricingCard({
  type,
  title,
  price,
  subtitle,
  buttonText,
  disabled,
  onClick,
  features,
  highlight,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className={`price-card ${highlight ? "highlight-card" : ""}`}
    >
      {highlight && <div className="best-badge">Best Value</div>}

      <h2>{title}</h2>
      <p className="price">
        {price}
        <span>{subtitle}</span>
      </p>

      <button
        className={disabled ? "btn disabled" : "btn"}
        onClick={disabled ? null : onClick}
      >
        {buttonText}
      </button>

      <ul className="feature-list">
        {features.map((f, index) => (
          <li key={index} className="feature-item">
            <span className="feature-title">{f.title}</span>
            <span className="feature-value">{f.value}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

// Payment Modal Component
function PaymentModal({ isOpen, onClose, planTitle, onPaymentOptionClick }) {
  if (!isOpen) return null;

  const paymentOptions = [
    {
      id: "cards_paypal",
      title: "Cards / PayPal",
      description: "Pay with credit/debit card or PayPal",
      icon: "💳",
      color: "#3b82f6",
    },
    {
      id: "crypto",
      title: "Crypto Network",
      description: "Pay with Bitcoin, Ethereum, or other cryptocurrencies",
      icon: "₿",
      color: "#f59e0b",
    },
    {
      id: "binance",
      title: "Binance Pay",
      description: "Pay directly with your Binance account",
      icon: "⚡",
      color: "#f0b90b",
    },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        className="modal-content"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Choose Payment Method</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <p className="selected-plan-text">
            Selected Plan: <strong>{planTitle}</strong>
          </p>

          <div className="payment-options-grid">
            {paymentOptions.map((option) => (
              <motion.div
                key={option.id}
                className="payment-option"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onPaymentOptionClick(option.id)}
              >
                <div
                  className="payment-icon"
                  style={{ backgroundColor: `${option.color}20` }}
                >
                  <span style={{ fontSize: "2rem", color: option.color }}>
                    {option.icon}
                  </span>
                </div>
                <div className="payment-info">
                  <h3>{option.title}</h3>
                  <p>{option.description}</p>
                </div>
                <div className="payment-arrow">→</div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .modal-content {
          background: white;
          border-radius: 1rem;
          width: 100%;
          max-width: 500px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          overflow: hidden;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
          color: #111827;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 1.8rem;
          cursor: pointer;
          color: #6b7280;
          padding: 0;
          width: 2rem;
          height: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.375rem;
        }

        .modal-close:hover {
          background: #f3f4f6;
          color: #374151;
        }

        .modal-body {
          padding: 1.5rem;
        }

        .selected-plan-text {
          margin-bottom: 1.5rem;
          padding: 0.75rem 1rem;
          background: #f8fafc;
          border-radius: 0.5rem;
          color: #475569;
          text-align: center;
        }

        .selected-plan-text strong {
          color: #1e293b;
        }

        .payment-options-grid {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .payment-option {
          display: flex;
          align-items: center;
          padding: 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
          background: white;
        }

        .payment-option:hover {
          border-color: #3b82f6;
          background: #f8fafc;
        }

        .payment-icon {
          width: 3.5rem;
          height: 3.5rem;
          border-radius: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 1rem;
          flex-shrink: 0;
        }

        .payment-info {
          flex: 1;
        }

        .payment-info h3 {
          margin: 0 0 0.25rem 0;
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
        }

        .payment-info p {
          margin: 0;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .payment-arrow {
          color: #9ca3af;
          font-size: 1.25rem;
          margin-left: 0.5rem;
        }
      `}</style>
    </div>
  );
}
