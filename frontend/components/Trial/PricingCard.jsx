import { useState, useEffect } from "react";
import { getFromIndexedDB } from "@/utils/indexedDB";

const PricingCard = ({ plan, isPopular = false }) => {
  const [paddle, setPaddle] = useState(null);
  const [user, setUser] = useState(null); // ✅ store user

  useEffect(() => {
    const loadUser = async () => {
      const storedUser = await getFromIndexedDB("user"); // ⚠️ use correct key
      if (storedUser?.email && storedUser?.userId) {
        setUser(storedUser);
      }
    };

    loadUser();
  }, []);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.async = true;

    script.onload = () => {
      if (process.env.NODE_ENV === "development") {
        window.Paddle.Environment.set("sandbox");
      }

      window.Paddle.Initialize({
        token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
        eventCallback: (event) => {
          if (event.name === "checkout.completed") {
            console.log("✅ Payment completed", event);
          }
        },
      });

      setPaddle(window.Paddle);
    };

    document.head.appendChild(script);
    return () => document.head.removeChild(script);
  }, []);

  /* ------------------ OPEN CHECKOUT ------------------ */
  const handleSubscribe = (priceId) => {
    if (!paddle || !user) return;

    paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: {
        email: user.email,
        name: user.name,
      },
      customData: {
        userId: user.userId, // 🔥 REQUIRED for webhook mapping
        planType: plan.type,
      },
    });
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
