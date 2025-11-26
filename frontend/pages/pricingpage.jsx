import { useState, useEffect } from "react";
import axios from "axios";
import { getFromIndexedDB, saveToIndexedDB } from "../utils/indexedDB";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export default function Pricing() {
  const [plans, setPlans] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [userCountry, setUserCountry] = useState("US");
  const [isIndia, setIsIndia] = useState(false);

  useEffect(() => {
    fetchPricingPlans();
  }, []);

  const fetchPricingPlans = async () => {
    try {
      // Try to get from cache first
      const cachedPlans = await getFromIndexedDB("pricing-plans");
      if (cachedPlans) {
        setPlans(cachedPlans.plans);
        setUserCountry(cachedPlans.country);
        setIsIndia(cachedPlans.isIndia);
        setLoading(false);
      }

      const res = await axios.get(`${API_BASE}/api/paddle/plans`, {
        withCredentials: true,
      });

      if (res.data.success) {
        setPlans(res.data.plans);
        setUserCountry(res.data.country);
        setIsIndia(res.data.isIndia);
        // Cache for 1 hour
        await saveToIndexedDB("pricing-plans", res.data, 60 * 60 * 1000);
      }
    } catch (error) {
      console.error("Failed to fetch pricing plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = async (planKey, billingPeriod = "monthly") => {
    if (processing) return;

    try {
      setProcessing(true);

      if (planKey === "free") {
        const res = await axios.post(
          `${API_BASE}/api/paddle/create-checkout`,
          { plan: "free", billingPeriod: "monthly" },
          { withCredentials: true }
        );

        if (res.data.success) {
          alert("Free plan activated successfully!");
          window.location.href = "/dashboard";
        }
        return;
      }

      // Try different endpoints in sequence
      const endpoints = [
        "/api/paddle/create-hosted-checkout",
        "/api/paddle/create-checkout",
      ];

      let lastError = null;

      for (const endpoint of endpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint}`);
          const res = await axios.post(
            `${API_BASE}${endpoint}`,
            {
              plan: planKey === "lifetime" ? "lifetime" : "pro",
              billingPeriod,
            },
            { withCredentials: true, timeout: 15000 }
          );

          if (res.data.success && res.data.checkoutUrl) {
            console.log("Checkout URL received:", res.data.checkoutUrl);
            window.location.href = res.data.checkoutUrl;
            return;
          } else {
            lastError = new Error(
              `No checkout URL from ${endpoint}: ${JSON.stringify(res.data)}`
            );
            console.error(lastError.message);
          }
        } catch (error) {
          lastError = error;
          console.error(
            `Endpoint ${endpoint} failed:`,
            error.response?.data || error.message
          );

          // If it's an authentication error, no need to try other endpoints
          if (error.response?.data?.message?.includes("authentication")) {
            break;
          }
        }
      }

      // If all endpoints failed
      if (lastError) {
        const errorMessage =
          lastError.response?.data?.message ||
          lastError.response?.data?.error?.detail ||
          lastError.message ||
          "Failed to create checkout. Please try again.";

        alert(`Payment Error: ${errorMessage}`);
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("An unexpected error occurred. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading pricing plans...</p>
      </div>
    );
  }

  if (!plans) {
    return (
      <div className="error-container">
        <h2>Unable to load pricing plans</h2>
        <button onClick={fetchPricingPlans} className="retry-btn">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="pricing-container">
      <div className="pricing-header">
        <h1>Choose Your Plan</h1>
        <p>Select the perfect plan for your needs</p>
        <div className="country-badge">
          Pricing for: {isIndia ? "India" : "International"}
        </div>
      </div>

      <div className="plans-grid">
        {/* Free Plan */}
        <div className="plan-card free-plan">
          <div className="plan-header">
            <h3>{plans.free.name}</h3>
            <div className="price">
              <span className="amount">${plans.free.price}</span>
              <span className="period">/{plans.free.billingPeriod}</span>
            </div>
          </div>
          <ul className="features-list">
            {plans.free.features.map((feature, index) => (
              <li key={index}>✓ {feature}</li>
            ))}
          </ul>
          <button
            onClick={() => handlePlanSelect("free")}
            className="plan-btn free-btn"
            disabled={processing}
          >
            {processing ? "Processing..." : "Get Started Free"}
          </button>
        </div>

        {/* Pro Monthly */}
        <div className="plan-card pro-plan">
          <div className="plan-badge">Popular</div>
          <div className="plan-header">
            <h3>{plans.pro.name}</h3>
            <div className="price">
              <span className="amount">${plans.pro.price}</span>
              <span className="period">/{plans.pro.billingPeriod}</span>
            </div>
          </div>
          <ul className="features-list">
            {plans.pro.features.map((feature, index) => (
              <li key={index}>✓ {feature}</li>
            ))}
          </ul>
          <button
            onClick={() => handlePlanSelect("pro", "monthly")}
            className="plan-btn pro-btn"
            disabled={processing}
          >
            {processing ? "Processing..." : "Get Started"}
          </button>
        </div>

        {/* Pro Yearly */}
        <div className="plan-card pro-yearly-plan">
          <div className="plan-badge save-badge">Save 43%</div>
          <div className="plan-header">
            <h3>{plans.proYearly.name}</h3>
            <div className="price">
              <span className="amount">${plans.proYearly.price}</span>
              <span className="period">/year</span>
            </div>
            <div className="equivalent-price">
              Equivalent to ${(plans.proYearly.price / 12).toFixed(2)}/month
            </div>
          </div>
          <ul className="features-list">
            {plans.proYearly.features.map((feature, index) => (
              <li key={index}>✓ {feature}</li>
            ))}
          </ul>
          <button
            onClick={() => handlePlanSelect("pro", "yearly")}
            className="plan-btn pro-yearly-btn"
            disabled={processing}
          >
            {processing ? "Processing..." : "Get Started"}
          </button>
        </div>

        {/* Lifetime */}
        <div className="plan-card lifetime-plan">
          <div className="plan-badge">Best Value</div>
          <div className="plan-header">
            <h3>{plans.lifetime.name}</h3>
            <div className="price">
              <span className="amount">${plans.lifetime.price}</span>
              <span className="period">one-time</span>
            </div>
          </div>
          <ul className="features-list">
            {plans.lifetime.features.map((feature, index) => (
              <li key={index}>✓ {feature}</li>
            ))}
          </ul>
          <button
            onClick={() => handlePlanSelect("lifetime", "lifetime")}
            className="plan-btn lifetime-btn"
            disabled={processing}
          >
            {processing ? "Processing..." : "Get Lifetime Access"}
          </button>
        </div>
      </div>

      <div className="pricing-footer">
        <p>All plans include 14-day money back guarantee</p>
        <p>Secure payment processed by Paddle</p>
      </div>
    </div>
  );
}
