import { useState, useEffect } from "react";

const PricingCard = ({ plan, isPopular = false }) => {
  const [paddle, setPaddle] = useState(null);

  useEffect(() => {
    if (window.Paddle) return;

    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.async = true;

    script.onload = () => {
      if (!window.Paddle) {
        console.error("❌ Paddle failed to load");
        return;
      }

      // 🚨 DO NOT manually set environment in LIVE
      // Paddle auto-detects environment from token

      window.Paddle.Initialize({
        token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,

        // 🔥 Checkout events
        eventCallback: (event) => {
          console.log("📩 Paddle event:", event);

          if (event.name === "checkout.completed") {
            console.log("✅ Payment completed:", event);

            /**
             * IMPORTANT:
             * Do NOT update DB here.
             * Use Paddle Webhooks instead (authoritative source).
             */
          }
        },
      });

      setPaddle(window.Paddle);
      console.log("🎉 Paddle initialized (LIVE-safe)");
    };

    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const handleSubscribe = (priceId, user) => {
    if (!paddle) {
      alert("Payment system not ready");
      return;
    }

    if (!user?.email || !user?._id) {
      alert("Please log in before purchasing");
      return;
    }

    try {
      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],

        customer: {
          email: user.email, // 🔴 REQUIRED in LIVE
        },

        customData: {
          userId: user._id, // 🔥 Used in webhook to update DB
        },

        settings: {
          displayMode: "overlay",
        },
      });
    } catch (error) {
      console.error("❌ Error opening checkout:", error);
    }
  };

  const getPriceDisplay = () => {
    switch (plan.type) {
      case "free":
        return "$0";
      case "monthly":
        return `$${plan.priceMonthly}/month`;
      case "yearly":
        return `$${plan.priceYearly}/month`;
      case "lifetime":
        return `$${plan.priceLifetime}`;
      default:
        return "";
    }
  };

  const getPriceId = () => {
    switch (plan.type) {
      case "monthly":
        return process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_MONTHLY;
      case "yearly":
        return process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_YEARLY;
      case "lifetime":
        return process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_LIFETIME;
      default:
        return null;
    }
  };

  return (
    <div className={`pricing-card ${isPopular ? "popular" : ""}`}>
      {isPopular && <div className="popular-badge">Most Popular</div>}

      <div className="plan-header">
        <h3>{plan.name}</h3>
        <div className="price">{getPriceDisplay()}</div>
        {plan.type === "yearly" && (
          <div className="billing-note">
            billed annually (${plan.priceYearly * 12} total)
          </div>
        )}
        {plan.type === "lifetime" && (
          <div className="billing-note">one-time payment</div>
        )}
      </div>

      <div className="plan-features">
        {plan.features.map((feature, index) => (
          <div key={index} className="feature">
            <span>✓</span> {feature}
          </div>
        ))}
      </div>

      <button
        className={`cta-button ${isPopular ? "primary" : "secondary"}`}
        onClick={() => plan.type !== "free" && handleSubscribe(getPriceId())}
        disabled={plan.type === "free"}
      >
        {plan.type === "free" ? "Get Started" : "Subscribe Now"}
      </button>
    </div>
  );
};

export default PricingCard;
