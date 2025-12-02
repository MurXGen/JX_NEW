// pages/pricing.js
import { useCallback, useEffect } from "react";
import PaddleLoader from "../components/payments/PaddleLoader";

const monthlyPriceId = process.env.NEXT_PUBLIC_PADDLE_MONTHLY_PRICE_ID;
const yearlyPriceId = process.env.NEXT_PUBLIC_PADDLE_YEARLY_PRICE_ID;
const lifetimePriceId = process.env.NEXT_PUBLIC_PADDLE_LIFETIME_PRICE_ID;

export default function Pricing() {
  // 🔍 Debug environment variables on mount
  useEffect(() => {
    console.log("=== Paddle Debug Info ===");
    console.log("Monthly Price ID:", monthlyPriceId);
    console.log("Yearly Price ID:", yearlyPriceId);
    console.log("Lifetime Price ID:", lifetimePriceId);
    console.log(
      "Paddle Object:",
      typeof window !== "undefined" ? window.Paddle : "window undefined"
    );
  }, []);

  const openCheckout = useCallback((priceId) => {
    console.log("⚡ Checkout button clicked with priceId:", priceId);

    if (!priceId) {
      console.error("❌ priceId is NULL or UNDEFINED");
    }

    if (typeof window === "undefined") {
      console.error("❌ window is undefined (Server Side)");
      alert("Window not ready.");
      return;
    }

    if (!window.Paddle) {
      console.error("❌ Paddle not loaded:", window.Paddle);
      alert("Paddle not loaded yet. Refresh or try again.");
      return;
    }

    const payload = {
      items: [{ priceId, quantity: 1 }],
      settings: { displayMode: "overlay" },
    };

    console.log("🛒 Checkout Payload:", payload);

    try {
      window.Paddle.Checkout.open(payload);
      console.log("✅ Paddle Checkout triggered");
    } catch (err) {
      console.error("❌ Paddle Checkout Error:", err);
    }
  }, []);

  return (
    <div>
      <PaddleLoader />
      <header style={styles.header}>
        <h1>Pricing</h1>
        <p>
          Simple test page — replace the priceIds in your .env with real ones.
        </p>
      </header>

      <main style={styles.container}>
        <div style={styles.card}>
          <h2>Free</h2>
          <p>$0 — Forever</p>
          <button disabled style={styles.buttonDisabled}>
            Current plan
          </button>
        </div>

        <div style={styles.card}>
          <h2>Pro — Monthly</h2>
          <p>$3.49 / month</p>
          <button
            style={styles.button}
            onClick={() => openCheckout(monthlyPriceId)}
          >
            Buy Monthly
          </button>
        </div>

        <div style={styles.card}>
          <h2>Pro — Yearly</h2>
          <p>$29.99 / year</p>
          <button
            style={styles.button}
            onClick={() => openCheckout(yearlyPriceId)}
          >
            Buy Yearly
          </button>
        </div>

        <div style={styles.card}>
          <h2>Lifetime</h2>
          <p>$99 — one time</p>
          <button
            style={styles.button}
            onClick={() => openCheckout(lifetimePriceId)}
          >
            Buy Lifetime
          </button>
        </div>
      </main>
    </div>
  );
}

const styles = {
  header: { textAlign: "center", padding: "2rem 1rem" },
  container: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
    gap: "1rem",
    maxWidth: 1000,
    margin: "0 auto",
    padding: "1rem",
  },
  card: {
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: 20,
    textAlign: "center",
    boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
  },
  button: {
    background: "#0066ff",
    color: "white",
    border: "none",
    padding: "10px 14px",
    borderRadius: 6,
    cursor: "pointer",
  },
  buttonDisabled: {
    background: "#e0e0e0",
    color: "#888",
    padding: "10px 14px",
    borderRadius: 6,
    border: "none",
  },
};
