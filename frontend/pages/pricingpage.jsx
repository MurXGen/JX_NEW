// pages/pricing.js
import { motion } from "framer-motion";
import PaddleLoader from "../components/payments/PaddleLoader";

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

export default function Pricing() {
  const openCheckout = (priceId) => {
    if (!window?.Paddle) return alert("Payment system not ready yet.");
    window.Paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      settings: { displayMode: "overlay" },
    });
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
            onClick={() => openCheckout(monthlyPriceId)}
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
            onClick={() => openCheckout(yearlyPriceId)}
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
            onClick={() => openCheckout(lifetimePriceId)}
            features={getPlanFeatures("lifetime")} // master renamed → lifetime
          />
        </div>
      </section>
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
