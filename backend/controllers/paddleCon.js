const { paddle, getPriceByRegion } = require("../utils/pricingConfig");
const User = require("../models/User");
const Order = require("../models/PaddleOrder");
const Subscription = require("../models/PaddleSub");

exports.createCheckout = async (req, res) => {
  try {
    const { plan, type, userCountry } = req.body;
    const userId = req.userId; // From auth middleware

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get price based on region
    const price = getPriceByRegion(userCountry, "pro", type);
    const currency = userCountry === "IN" ? "USD" : "USD"; // Paddle typically uses USD

    let paddleProductId;
    let recurringPrice;

    // Map to your actual Paddle product IDs
    if (type === "monthly") {
      paddleProductId = process.env.PADDLE_PRO_MONTHLY_PRODUCT_ID;
    } else if (type === "yearly") {
      paddleProductId = process.env.PADDLE_PRO_YEARLY_PRODUCT_ID;
      recurringPrice = `yearly`;
    } else if (type === "lifetime") {
      paddleProductId = process.env.PADDLE_PRO_LIFETIME_PRODUCT_ID;
    }

    const checkoutData = {
      product_id: paddleProductId,
      email: user.email,
      passthrough: JSON.stringify({
        userId: userId.toString(),
        plan: "pro",
        type: type,
      }),
      prices: [`${currency}:${price}`],
      return_url: `${process.env.FRONTEND_URL}/dashboard?payment=success`,
      ...(recurringPrice && {
        recurring_prices: [`${currency}:${recurringPrice}`],
      }),
    };

    const checkout = await paddle.createCheckout(checkoutData);

    // Create order record
    const order = new Order({
      user: userId,
      plan: "pro",
      type: type === "lifetime" ? "one-time" : "recurring",
      amount: price,
      currency: currency,
      status: "pending",
      paddleCheckoutId: checkout.id,
    });

    await order.save();

    res.json({ checkoutId: checkout.id, url: checkout.url });
  } catch (error) {
    console.error("Checkout creation error:", error);
    res.status(500).json({ error: "Failed to create checkout" });
  }
};

exports.handleWebhook = async (req, res) => {
  try {
    const event = req.body;

    // Verify webhook signature
    const signature = req.headers["paddle-signature"];
    const isValid = paddle.verifyWebhook(signature, req.rawBody);

    if (!isValid) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    if (event.alert_name === "payment_succeeded") {
      const passthrough = JSON.parse(event.passthrough);
      const { userId, plan, type } = passthrough;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Update or create subscription
      let subscription = await Subscription.findOne({ user: userId });

      if (!subscription) {
        subscription = new Subscription({
          user: userId,
          plan: plan,
          type: type === "lifetime" ? "lifetime" : "recurring",
          price: event.sale_gross,
          currency: event.currency,
          paddleSubscriptionId: event.subscription_id,
          paddleOrderId: event.order_id,
          startDate: new Date(),
          ...(type === "lifetime" && { endDate: null }),
        });
      } else {
        subscription.plan = plan;
        subscription.type = type === "lifetime" ? "lifetime" : "recurring";
        subscription.status = "active";
        subscription.price = event.sale_gross;
        subscription.paddleSubscriptionId = event.subscription_id;
        subscription.paddleOrderId = event.order_id;
        subscription.startDate = new Date();
        if (type === "lifetime") {
          subscription.endDate = null;
        }
      }

      await subscription.save();

      // Update user subscription info
      user.subscription = subscription._id;
      user.subscriptionStatus = "active";
      user.subscriptionPlan = plan;
      user.subscriptionType = type === "lifetime" ? "lifetime" : "recurring";
      user.subscriptionStartAt = new Date();

      if (type !== "lifetime") {
        // Set expiration date based on type
        const expiryDate = new Date();
        expiryDate.setFullYear(
          expiryDate.getFullYear() + (type === "yearly" ? 1 : 0)
        );
        expiryDate.setMonth(
          expiryDate.getMonth() + (type === "monthly" ? 1 : 0)
        );
        user.subscriptionExpiresAt = expiryDate;
      }

      await user.save();

      // Update order status
      await Order.findOneAndUpdate(
        { paddleCheckoutId: event.checkout_id },
        {
          status: "completed",
          paddleOrderId: event.order_id,
          paymentData: event,
        }
      );
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
};

exports.getUserSubscription = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId)
      .populate("subscription")
      .populate("orders");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      subscription: user.subscription,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionPlan: user.subscriptionPlan,
      subscriptionType: user.subscriptionType,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
    });
  } catch (error) {
    console.error("Get subscription error:", error);
    res.status(500).json({ error: "Failed to get subscription" });
  }
};
