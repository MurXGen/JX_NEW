const Plan = require("../model/Plan");

exports.upsertPlan = async (req, res) => {
  try {
    let plans = req.body;
    const results = [];

    // Check if it's a single plan object (has planId property)
    if (plans.planId) {
      plans = { [plans.planId]: plans };
    }

    for (const planId in plans) {
      const { name, monthly, yearly, icon } = plans[planId];

      // Ensure monthly and yearly exist
      const monthlyWithInrUsdt = {
        ...monthly,
        inrUsdt: monthly.inrUsdt ?? monthly.usdt * 90,
      };
      const yearlyWithInrUsdt = {
        ...yearly,
        inrUsdt: yearly.inrUsdt ?? yearly.usdt * 90,
      };

      const plan = await Plan.findOneAndUpdate(
        { planId },
        { name, monthly: monthlyWithInrUsdt, yearly: yearlyWithInrUsdt, icon },
        { new: true, upsert: true }
      );

      results.push(plan);
    }

    res.status(200).json({ success: true, plans: results });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getPlans = async (req, res) => {
  try {
    const plans = await Plan.find();
    res.status(200).json({ success: true, plans });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Delete plan
exports.deletePlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const plan = await Plan.findOneAndDelete({ planId });
    if (!plan)
      return res
        .status(404)
        .json({ success: false, message: "Plan not found" });

    res.status(200).json({ success: true, message: "Plan deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
