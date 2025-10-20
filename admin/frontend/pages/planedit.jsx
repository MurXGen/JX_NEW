"use client";

import axios from "axios";
import { DollarSign, Star, Zap } from "lucide-react";
import { useState } from "react";
import PlanList from "../components/PlanList";

const initialPlans = {
  pro: {
    name: "Pro",
    monthly: { inr: 149, usdt: 5 },
    yearly: { inr: 999, usdt: 10 },
  },
  elite: {
    name: "Elite",
    monthly: { inr: 499, usdt: 8 },
    yearly: { inr: 3999, usdt: 40 },
  },
  master: {
    name: "Master",
    monthly: { inr: 999, usdt: 15 },
    yearly: { inr: 9999, usdt: 100 },
  },
};

export default function PlanEdit() {
  const [plans, setPlans] = useState(initialPlans);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (planKey, period, currency, value) => {
    setPlans((prev) => ({
      ...prev,
      [planKey]: {
        ...prev[planKey],
        [period]: {
          ...prev[planKey][period],
          [currency]: value,
        },
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      console.log("Submitting plans:", plans); // 🔹 Check payload

      // Direct POST, no headers
      const response = await axios.post(
        "http://localhost:8000/api/plans/upsert",
        plans
      );

      console.log("Response from backend:", response.data); // 🔹 Check backend response
      setMessage("✅ Plans saved successfully!");
    } catch (err) {
      if (err.response) {
        setMessage(
          `❌ Error saving plans: ${err.response.data.message || err.message}`
        );
      } else if (err.request) {
        setMessage("❌ No response from server.");
      } else {
        setMessage(`❌ ${err.message}`);
      }
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
    <div style={{ maxWidth: "800px", margin: "2rem auto", padding: "1rem" }}>
      <h1>Admin: Edit Plans</h1>
      <form onSubmit={handleSubmit}>
        {Object.entries(plans).map(([key, plan]) => (
          <div
            key={key}
            style={{
              border: "1px solid #ccc",
              borderRadius: "8px",
              padding: "1rem",
              marginBottom: "1.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {planIcons[key]}
              <h2>{plan.name}</h2>
            </div>

            {/* Monthly */}
            <div style={{ marginTop: "12px" }}>
              <strong>Monthly Pricing</strong>
              <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
                <div>
                  <label>INR:</label>
                  <input
                    type="number"
                    value={plan.monthly.inr}
                    onChange={(e) =>
                      handleChange(
                        key,
                        "monthly",
                        "inr",
                        Number(e.target.value)
                      )
                    }
                    style={{ marginLeft: "4px" }}
                  />
                </div>
                <div>
                  <label>USDT:</label>
                  <input
                    type="number"
                    value={plan.monthly.usdt}
                    onChange={(e) =>
                      handleChange(
                        key,
                        "monthly",
                        "usdt",
                        Number(e.target.value)
                      )
                    }
                    style={{ marginLeft: "4px" }}
                  />
                </div>
              </div>
            </div>

            {/* Yearly */}
            <div style={{ marginTop: "12px" }}>
              <strong>Yearly Pricing</strong>
              <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
                <div>
                  <label>INR:</label>
                  <input
                    type="number"
                    value={plan.yearly.inr}
                    onChange={(e) =>
                      handleChange(key, "yearly", "inr", Number(e.target.value))
                    }
                    style={{ marginLeft: "4px" }}
                  />
                </div>
                <div>
                  <label>USDT:</label>
                  <input
                    type="number"
                    value={plan.yearly.usdt}
                    onChange={(e) =>
                      handleChange(
                        key,
                        "yearly",
                        "usdt",
                        Number(e.target.value)
                      )
                    }
                    style={{ marginLeft: "4px" }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "0.5rem 1rem",
            background: "#0d6efd",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Saving..." : "Save Plans"}
        </button>
      </form>

      {message && <p style={{ marginTop: "12px" }}>{message}</p>}

      <PlanList />
    </div>
  );
}
