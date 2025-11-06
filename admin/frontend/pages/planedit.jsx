"use client";
import axios from "axios";
import { DollarSign, Star, Zap } from "lucide-react";
import { useState } from "react";
import PlanList from "../components/PlanList";

const initialPlans = {
  pro: {
    name: "Pro",
    code: "pro",
    monthly: { inr: 149, inrUsdt: 2, usdt: 2 },
    yearly: { inr: 999, inrUsdt: 12, usdt: 12 },
    features: ["Basic AI Insights", "Single Account"],
    restrictions: {
      tradeLimitPerMonth: 100,
      accountLimit: 1,
      imageLimitPerMonth: 10,
      aiPrompts: 20,
      canAccessFinancialNews: false,
      canExportTrades: true,
      showAds: true,
    },
  },
  elite: {
    name: "Elite",
    code: "elite",
    monthly: { inr: 499, inrUsdt: 6, usdt: 6 },
    yearly: { inr: 3999, inrUsdt: 48, usdt: 48 },
    features: ["AI Insights", "Export Trades", "Multi-account Access"],
    restrictions: {
      tradeLimitPerMonth: 1000,
      accountLimit: 3,
      imageLimitPerMonth: 50,
      aiPrompts: 100,
      canAccessFinancialNews: true,
      canExportTrades: true,
      showAds: false,
    },
  },
  master: {
    name: "Master",
    code: "master",
    monthly: { inr: 999, inrUsdt: 12, usdt: 12 },
    yearly: { inr: 9999, inrUsdt: 120, usdt: 120 },
    features: [
      "Unlimited AI Insights",
      "Telegram Bot Access",
      "Priority Support",
    ],
    restrictions: {
      tradeLimitPerMonth: Infinity,
      accountLimit: 10,
      imageLimitPerMonth: 200,
      aiPrompts: 1000,
      canAccessFinancialNews: true,
      canAccessTelegramBot: true,
      canExportTrades: true,
      showAds: false,
    },
  },
};

export default function PlanEdit() {
  const [plans, setPlans] = useState(initialPlans);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (planKey, path, value) => {
    setPlans((prev) => {
      const updated = { ...prev };
      const keys = path.split(".");
      let obj = updated[planKey];
      for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await axios.post(
        "http://localhost:8000/api/plans/upsert",
        plans
      );
      setMessage("✅ Plans saved successfully!");
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const planIcons = {
    pro: <DollarSign size={20} color="skyblue" />,
    elite: <Zap size={20} color="orange" />,
    master: <Star size={20} color="yellow" />,
  };

  return (
    <div style={{ maxWidth: "850px", margin: "2rem auto", padding: "1rem" }}>
      <h1>Admin: Edit Plans</h1>
      <form onSubmit={handleSubmit}>
        {Object.entries(plans).map(([key, plan]) => (
          <div
            key={key}
            style={{
              border: "1px solid #ccc",
              borderRadius: 8,
              padding: 16,
              marginBottom: 24,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {planIcons[key]}
              <h2>{plan.name}</h2>
            </div>

            {/* Pricing Section */}
            <h4>Pricing</h4>
            {["monthly", "yearly"].map((period) => (
              <div key={period}>
                <strong>
                  {period.charAt(0).toUpperCase() + period.slice(1)}:
                </strong>
                <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                  {["inr", "inrUsdt", "usdt"].map((currency) => (
                    <div key={currency}>
                      <label>{currency.toUpperCase()}: </label>
                      <input
                        type="number"
                        value={plan[period][currency]}
                        onChange={(e) =>
                          handleChange(
                            key,
                            `${period}.${currency}`,
                            Number(e.target.value)
                          )
                        }
                        style={{ marginLeft: 4, width: 80 }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Features */}
            <h4 style={{ marginTop: 12 }}>Features</h4>
            {plan.features.map((f, i) => (
              <input
                key={i}
                type="text"
                value={f}
                onChange={(e) =>
                  handleChange(key, `features.${i}`, e.target.value)
                }
                style={{ display: "block", marginBottom: 4, width: "100%" }}
              />
            ))}

            {/* Restrictions */}
            <h4 style={{ marginTop: 12 }}>Restrictions</h4>
            {Object.entries(plan.restrictions).map(([rKey, val]) => (
              <div key={rKey} style={{ marginBottom: 6 }}>
                <label>
                  {rKey}:{" "}
                  {typeof val === "boolean" ? (
                    <input
                      type="checkbox"
                      checked={val}
                      onChange={(e) =>
                        handleChange(
                          key,
                          `restrictions.${rKey}`,
                          e.target.checked
                        )
                      }
                    />
                  ) : (
                    <input
                      type="number"
                      value={val}
                      onChange={(e) =>
                        handleChange(
                          key,
                          `restrictions.${rKey}`,
                          Number(e.target.value)
                        )
                      }
                      style={{ marginLeft: 4, width: 100 }}
                    />
                  )}
                </label>
              </div>
            ))}
          </div>
        ))}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "0.6rem 1.2rem",
            background: "#0d6efd",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Saving..." : "Save All Plans"}
        </button>
      </form>
      {message && <p style={{ marginTop: 12 }}>{message}</p>}

      <PlanList />
    </div>
  );
}
