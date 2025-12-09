// controllers/paddleCtrl.js
const User = require("../models/User");
const Plan = require("../models/Plan");

exports.paddleWebhook = async (req, res) => {
  try {
    const event = req.body;

    // Paddle v2 event type
    if (event?.event_type === "payment.completed") {
      const userId = req.cookies.userId;
      const planCode = event.data?.items?.[0]?.price?.product_id;
      const amount = event.data?.grand_total;
      const currency = event.data?.currency;

      if (!userId || !planCode) {
        return res.status(400).json({ message: "Missing important details." });
      }

      // Get Plan Info (PRO001, MASTER001 etc)
      const planData = await Plan.findOne({ planCode: planCode });
      if (!planData) {
        return res.status(400).json({ message: "Plan not found." });
      }

      // Update User
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          subscriptionStatus: "active",
          subscriptionPlan: planData.planCode,
          subscriptionType: planData.planType, // lifetime | recurring | one-time
          subscriptionStartAt: new Date(),
          subscriptionExpiresAt:
            planData.planType === "lifetime"
              ? null
              : new Date(Date.now() + planData.validityDays * 86400000),
          subscriptionCreatedAt: new Date(),
          paddleCustomerId: event.data?.customer?.id,
          lastBillingDate: new Date(),
          nextBillingDate:
            planData.planType === "recurring"
              ? new Date(Date.now() + 30 * 86400000)
              : null,
        },
        { new: true }
      );

      console.log("Paddle Subscription Updated:", updatedUser.email);
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Paddle Webhook Error:", err);
    res.status(500).json({ error: err.message });
  }
};
