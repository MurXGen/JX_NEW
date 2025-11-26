const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Subscription = require("../models/PaddleSub");
const Order = require("../models/PaddleOrder");
const axios = require("axios");

// Paddle API configuration
const PADDLE_API_KEY = process.env.PADDLE_API_KEY;

// Get pricing plans based on user location
router.get("/plans", async (req, res) => {
  try {
    const userCountry =
      req.headers["cf-ipcountry"] || req.headers["x-vercel-ip-country"] || "US";
    const isIndia = userCountry === "IN";

    const plans = {
      free: {
        name: "PRO Plan",
        price: 0,
        originalPrice: 0,
        billingPeriod: "monthly",
        type: "one-time",
        features: ["Basic features", "Limited access", "Community support"],
      },
      pro: {
        name: "PRO Monthly",
        price: isIndia ? 3.49 : 6.98,
        originalPrice: isIndia ? 3.49 : 6.98,
        billingPeriod: "monthly",
        type: "recurring",
        features: ["All PRO features", "Priority support", "Advanced tools"],
      },
      proYearly: {
        name: "PRO Yearly",
        price: isIndia ? 24 : 48,
        originalPrice: isIndia ? 24 : 48,
        billingPeriod: "yearly",
        type: "recurring",
        features: [
          "All PRO features",
          "Priority support",
          "Advanced tools",
          "Save 43%",
        ],
      },
      lifetime: {
        name: "Lifetime Access",
        price: isIndia ? 99 : 198,
        originalPrice: isIndia ? 99 : 198,
        billingPeriod: "lifetime",
        type: "lifetime",
        features: [
          "All features forever",
          "Lifetime updates",
          "Priority support",
          "One-time payment",
        ],
      },
    };

    res.json({
      success: true,
      plans,
      country: userCountry,
      isIndia,
    });
  } catch (error) {
    console.error("Pricing plans error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Create Paddle checkout with proper URL extraction
router.post("/create-checkout", async (req, res) => {
  try {
    const userId = req.cookies.userId;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }

    const { plan, billingPeriod } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Get user country from headers
    const userCountry =
      req.headers["cf-ipcountry"] || req.headers["x-vercel-ip-country"] || "US";
    const isIndia = userCountry === "IN";

    let priceId;

    switch (plan) {
      case "free":
        user.subscriptionPlan = "pro";
        user.subscriptionType = "one-time";
        user.subscriptionStatus = "active";
        user.subscriptionStartAt = new Date();
        await user.save();

        return res.json({
          success: true,
          isFree: true,
          message: "Free plan activated successfully",
        });

      case "pro":
        if (billingPeriod === "yearly") {
          priceId = isIndia
            ? process.env.PADDLE_PRO_YEARLY_IN_ID
            : process.env.PADDLE_PRO_YEARLY_ID;
        } else {
          priceId = isIndia
            ? process.env.PADDLE_PRO_MONTHLY_IN_ID
            : process.env.PADDLE_PRO_MONTHLY_ID;
        }
        break;

      case "lifetime":
        priceId = isIndia
          ? process.env.PADDLE_LIFETIME_IN_ID
          : process.env.PADDLE_LIFETIME_ID;
        break;

      default:
        return res
          .status(400)
          .json({ success: false, message: "Invalid plan" });
    }

    // Validate price ID exists
    if (!priceId) {
      return res.status(400).json({
        success: false,
        message: "Price ID not configured for this plan",
      });
    }

    console.log("Using price ID:", priceId);

    // Create order
    const order = new Order({
      user: userId,
      plan: plan === "pro" ? "pro" : "lifetime",
      type: billingPeriod === "lifetime" ? "lifetime" : "recurring",
      amount: 0,
      currency: "USD",
      status: "pending",
      billingPeriod,
      country: userCountry,
    });
    await order.save();

    // Create checkout with minimal required fields
    const checkoutData = {
      items: [
        {
          price_id: priceId,
          quantity: 1,
        },
      ],
    };

    console.log(
      "Creating checkout with data:",
      JSON.stringify(checkoutData, null, 2)
    );

    const response = await axios.post(
      "https://api.paddle.com/transactions",
      checkoutData,
      {
        headers: {
          Authorization: `Bearer ${PADDLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    const checkout = response.data;

    console.log("Full Paddle response received");

    // Extract checkout URL - FIXED VERSION
    let checkoutUrl = null;
    let checkoutId = null;

    if (checkout.data) {
      checkoutId = checkout.data.id;

      // Check all possible locations for the checkout URL
      if (checkout.data.checkout && checkout.data.checkout.url) {
        checkoutUrl = checkout.data.checkout.url;
      } else if (checkout.data.url) {
        checkoutUrl = checkout.data.url;
      } else if (checkout.data.details && checkout.data.details.checkout_url) {
        checkoutUrl = checkout.data.details.checkout_url;
      }
    }

    console.log("Extracted checkout info:", { checkoutId, checkoutUrl });

    if (checkoutId) {
      order.paddleCheckoutId = checkoutId;
      await order.save();
    }

    if (checkoutUrl) {
      console.log("Checkout URL successfully extracted:", checkoutUrl);
      res.json({
        success: true,
        checkoutUrl: checkoutUrl,
        orderId: order._id,
      });
    } else {
      console.error("No checkout URL found. Available paths:", {
        "checkout.data.checkout.url": checkout.data?.checkout?.url,
        "checkout.data.url": checkout.data?.url,
        "checkout.data.details.checkout_url":
          checkout.data?.details?.checkout_url,
        fullResponse: checkout,
      });

      res.status(500).json({
        success: false,
        message: "Paddle returned transaction but no checkout URL",
        debug: {
          transactionId: checkoutId,
          availablePaths: {
            checkoutDataCheckoutUrl: checkout.data?.checkout?.url,
            checkoutDataUrl: checkout.data?.url,
            checkoutDataDetailsUrl: checkout.data?.details?.checkout_url,
          },
        },
      });
    }
  } catch (error) {
    console.error(
      "Create checkout error:",
      error.response?.data || error.message
    );

    let errorMessage = "Failed to create checkout";
    if (error.response?.data?.error?.code === "authentication_required") {
      errorMessage = "Paddle authentication failed - check your API key";
    } else if (error.response?.data?.error?.code === "resource_not_found") {
      errorMessage = "Price ID not found - check your product configuration";
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.response?.data || error.message,
    });
  }
});

// Alternative: Use Paddle's hosted checkout
router.post("/create-hosted-checkout", async (req, res) => {
  try {
    const userId = req.cookies.userId;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }

    const { plan, billingPeriod } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const userCountry =
      req.headers["cf-ipcountry"] || req.headers["x-vercel-ip-country"] || "US";
    const isIndia = userCountry === "IN";

    let priceId;

    switch (plan) {
      case "free":
        user.subscriptionPlan = "pro";
        user.subscriptionType = "one-time";
        user.subscriptionStatus = "active";
        user.subscriptionStartAt = new Date();
        await user.save();
        return res.json({
          success: true,
          isFree: true,
          message: "Free plan activated",
        });

      case "pro":
        priceId =
          billingPeriod === "yearly"
            ? isIndia
              ? process.env.PADDLE_PRO_YEARLY_IN_ID
              : process.env.PADDLE_PRO_YEARLY_ID
            : isIndia
              ? process.env.PADDLE_PRO_MONTHLY_IN_ID
              : process.env.PADDLE_PRO_MONTHLY_ID;
        break;

      case "lifetime":
        priceId = isIndia
          ? process.env.PADDLE_LIFETIME_IN_ID
          : process.env.PADDLE_LIFETIME_ID;
        break;

      default:
        return res
          .status(400)
          .json({ success: false, message: "Invalid plan" });
    }

    // Create order
    const order = new Order({
      user: userId,
      plan: plan === "pro" ? "pro" : "lifetime",
      type: billingPeriod === "lifetime" ? "lifetime" : "recurring",
      amount: 0,
      status: "pending",
      billingPeriod,
      country: userCountry,
    });
    await order.save();

    // Use Paddle's checkout creation with more fields
    const checkoutData = {
      items: [
        {
          price_id: priceId,
          quantity: 1,
        },
      ],
      customer_id: userId.toString(),
      custom_data: {
        userId: userId.toString(),
        orderId: order._id.toString(),
      },
      return_url: `${process.env.CLIENT_URL}/dashboard?payment=success`,
    };

    console.log(
      "Hosted checkout attempt with data:",
      JSON.stringify(checkoutData, null, 2)
    );

    const response = await axios.post(
      "https://api.paddle.com/transactions",
      checkoutData,
      {
        headers: {
          Authorization: `Bearer ${PADDLE_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const result = response.data;

    console.log("Hosted checkout response:", JSON.stringify(result, null, 2));

    // Try to find checkout URL in different possible locations
    const checkoutUrl =
      result.data?.url ||
      result.data?.checkout_url ||
      result.data?.hosted_checkout_url ||
      result.url ||
      result.checkout_url;

    if (checkoutUrl) {
      order.paddleCheckoutId = result.data?.id || result.id;
      await order.save();

      res.json({
        success: true,
        checkoutUrl: checkoutUrl,
        orderId: order._id,
      });
    } else {
      throw new Error(
        `No checkout URL found. Response: ${JSON.stringify(result)}`
      );
    }
  } catch (error) {
    console.error(
      "Hosted checkout error:",
      error.response?.data || error.message
    );
    res.status(500).json({
      success: false,
      message: "Failed to create hosted checkout",
      error: error.response?.data || error.message,
    });
  }
});

// Handle Paddle webhook
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const event = JSON.parse(req.body.toString());
      const { data, event_type } = event;

      console.log("Webhook received:", event_type);

      switch (event_type) {
        case "transaction.completed":
          await handleSuccessfulPayment(data);
          break;
        case "subscription.created":
          await handleSubscriptionCreated(data);
          break;
        default:
          console.log("Unhandled webhook:", event_type);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({ success: false });
    }
  }
);

async function handleSuccessfulPayment(data) {
  try {
    const customData = data.custom_data || {};
    const userId = customData.userId;
    const orderId = customData.orderId;

    if (userId && orderId) {
      const order = await Order.findById(orderId);
      if (order) {
        order.status = "paid";
        order.paddleOrderId = data.id;
        order.amount = data.totals?.total || 0;
        await order.save();
      }

      const user = await User.findById(userId);
      if (user) {
        user.subscriptionStatus = "active";
        user.subscriptionPlan = customData.plan || "pro";
        user.subscriptionType =
          customData.billingPeriod === "lifetime" ? "lifetime" : "recurring";
        user.subscriptionStartAt = new Date();
        await user.save();
      }
    }
  } catch (error) {
    console.error("Webhook payment handling error:", error);
  }
}

async function handleSubscriptionCreated(data) {
  console.log("Subscription created:", data);
}

// Debug endpoint
router.get("/debug-setup", async (req, res) => {
  try {
    const priceIds = [
      process.env.PADDLE_PRO_MONTHLY_ID,
      process.env.PADDLE_PRO_MONTHLY_IN_ID,
      process.env.PADDLE_PRO_YEARLY_ID,
      process.env.PADDLE_PRO_YEARLY_IN_ID,
      process.env.PADDLE_LIFETIME_ID,
      process.env.PADDLE_LIFETIME_IN_ID,
    ].filter(Boolean);

    const results = [];

    for (const priceId of priceIds) {
      try {
        const response = await axios.get(
          `https://api.paddle.com/prices?price_ids=${priceId}`,
          {
            headers: {
              Authorization: `Bearer ${PADDLE_API_KEY}`,
            },
          }
        );

        const priceData = response.data.data?.[0];
        results.push({
          priceId,
          status: "valid",
          productId: priceData?.product_id,
          name: priceData?.name,
          unitPrice: priceData?.unit_price,
        });
      } catch (error) {
        results.push({
          priceId,
          status: "invalid",
          error: error.response?.data?.error?.detail || error.message,
        });
      }
    }

    res.json({
      success: true,
      apiKey: PADDLE_API_KEY ? "Configured" : "Missing",
      environment: process.env.NODE_ENV,
      clientUrl: process.env.CLIENT_URL,
      priceResults: results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
