const Plan = require("../model/Plan");

// ✅ Create or Update multiple plans (bulk or single)
exports.upsertPlans = async (req, res) => {
  try {
    const plans = req.body; // expecting { pro: {...}, elite: {...}, ... }
    const results = [];

    for (const code in plans) {
      const planData = plans[code];
      if (!planData) continue;

      const {
        name,
        monthly,
        yearly,
        features,
        restrictions,
        isActive = true,
      } = planData;

      // Auto-calculate INR→USDT equivalence if missing
      const monthlyWithInrUsdt = {
        ...monthly,
        inrUsdt: monthly.inrUsdt ?? (monthly.usdt ? monthly.usdt * 90 : 0),
      };
      const yearlyWithInrUsdt = {
        ...yearly,
        inrUsdt: yearly.inrUsdt ?? (yearly.usdt ? yearly.usdt * 90 : 0),
      };

      const updated = await Plan.findOneAndUpdate(
        { code },
        {
          name,
          code,
          monthly: monthlyWithInrUsdt,
          yearly: yearlyWithInrUsdt,
          features: features || [],
          restrictions: restrictions || {},
          isActive,
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      results.push(updated);
    }

    res.status(200).json({ success: true, plans: results });
  } catch (err) {
    console.error("Plan upsert error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ✅ Fetch all plans
exports.getPlans = async (req, res) => {
  try {
    const plans = await Plan.find();
    res.status(200).json({ success: true, plans });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ✅ Delete plan by code
exports.deletePlan = async (req, res) => {
  try {
    const { code } = req.params;
    const deleted = await Plan.findOneAndDelete({ code });
    if (!deleted)
      return res
        .status(404)
        .json({ success: false, message: "Plan not found" });

    res.status(200).json({ success: true, message: "Plan deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
