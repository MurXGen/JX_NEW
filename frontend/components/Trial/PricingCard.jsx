import { useState, useEffect } from "react";

const PricingCard = ({ plan, isPopular = false }) => {
  const [paddle, setPaddle] = useState(null);

  useEffect(() => {
    // Load Paddle.js
    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.onload = () => {
      window.Paddle.Environment.set("sandbox"); // Change to 'production' for live
      window.Paddle.Initialize({
        token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
        eventCallback: function (data) {
          if (data.name === "checkout.completed") {
            // Handle successful payment
            console.log("Payment completed", data);
          }
        },
      });
      setPaddle(window.Paddle);
    };
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const handleSubscribe = async (priceId) => {
    if (!paddle) return;

    try {
      // For one-time purchases (lifetime)
      if (plan.type === "lifetime") {
        paddle.Checkout.open({
          items: [{ priceId: priceId, quantity: 1 }],
          customer: {
            email: "customer@example.com", // You can pre-fill or get from user
          },
        });
      } else {
        // For subscriptions
        paddle.Checkout.open({
          items: [{ priceId: priceId, quantity: 1 }],
          customer: {
            email: "customer@example.com",
          },
        });
      }
    } catch (error) {
      console.error("Error opening checkout:", error);
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
