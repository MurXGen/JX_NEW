"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { Pencil, Trash2 } from "lucide-react";

const PlanList = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [editPlan, setEditPlan] = useState(null);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:8000/api/plans");
      if (res.data.success) setPlans(res.data.plans);
    } catch (err) {
      console.error(err);
      setMessage("❌ Error fetching plans");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (planId) => {
    if (!confirm("Are you sure you want to delete this plan?")) return;

    try {
      const res = await axios.delete(
        `http://localhost:8000/api/plans/${planId}`
      );
      if (res.data.success) {
        setMessage("✅ Plan deleted");
        fetchPlans();
      }
    } catch (err) {
      console.error(err);
      setMessage("❌ Error deleting plan");
    }
  };

  const handleEdit = (plan) => setEditPlan(plan);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editPlan) return;
    try {
      const res = await axios.post(
        "http://localhost:8000/api/plans/upsert",
        editPlan
      );
      if (res.data.success) {
        setMessage("✅ Plan updated");
        setEditPlan(null);
        fetchPlans();
      }
    } catch (err) {
      console.error(err);
      setMessage("❌ Error updating plan");
    }
  };

  const handleChange = (field, subfield, value) => {
    setEditPlan((prev) => ({
      ...prev,
      [field]: { ...prev[field], [subfield]: Number(value) },
    }));
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Plans</h2>
      {message && <p>{message}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Plan ID</th>
                <th>Name</th>
                <th>Monthly INR</th>
                <th>Monthly INR USDT</th>
                <th>Monthly USDT</th>
                <th>Yearly INR</th>
                <th>Yearly INR USDT</th>
                <th>Yearly USDT</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.planId}>
                  <td>{plan.planId}</td>
                  <td>{plan.name}</td>
                  <td>{plan.monthly?.inr}</td>
                  <td>{plan.monthly?.inrUsdt}</td>
                  <td>{plan.monthly?.usdt}</td>
                  <td>{plan.yearly?.inr}</td>
                  <td>{plan.yearly?.inrUsdt}</td>
                  <td>{plan.yearly?.usdt}</td>
                  <td>
                    <button
                      onClick={() => handleEdit(plan)}
                      style={{ marginRight: "8px" }}
                    >
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => handleDelete(plan.planId)}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {editPlan && (
            <form
              onSubmit={handleUpdate}
              style={{
                marginTop: "20px",
                padding: "12px",
                border: "1px solid #ccc",
              }}
            >
              <h3>Edit {editPlan.name} Plan</h3>

              <div>
                <strong>Monthly</strong>
                <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
                  <input
                    type="number"
                    value={editPlan.monthly.inr}
                    onChange={(e) =>
                      handleChange("monthly", "inr", e.target.value)
                    }
                    placeholder="INR"
                  />
                  <input
                    type="number"
                    value={editPlan.monthly.inrUsdt}
                    onChange={(e) =>
                      handleChange("monthly", "inrUsdt", e.target.value)
                    }
                    placeholder="INR->USDT"
                  />
                  <input
                    type="number"
                    value={editPlan.monthly.usdt}
                    onChange={(e) =>
                      handleChange("monthly", "usdt", e.target.value)
                    }
                    placeholder="USDT"
                  />
                </div>
              </div>

              <div style={{ marginTop: "12px" }}>
                <strong>Yearly</strong>
                <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
                  <input
                    type="number"
                    value={editPlan.yearly.inr}
                    onChange={(e) =>
                      handleChange("yearly", "inr", e.target.value)
                    }
                    placeholder="INR"
                  />
                  <input
                    type="number"
                    value={editPlan.yearly.inrUsdt}
                    onChange={(e) =>
                      handleChange("yearly", "inrUsdt", e.target.value)
                    }
                    placeholder="INR->USDT"
                  />
                  <input
                    type="number"
                    value={editPlan.yearly.usdt}
                    onChange={(e) =>
                      handleChange("yearly", "usdt", e.target.value)
                    }
                    placeholder="USDT"
                  />
                </div>
              </div>

              <button type="submit" style={{ marginTop: "12px" }}>
                Update Plan
              </button>
              <button
                type="button"
                style={{ marginLeft: "12px" }}
                onClick={() => setEditPlan(null)}
              >
                Cancel
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
};

export default PlanList;
