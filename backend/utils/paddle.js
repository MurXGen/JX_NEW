const axios = require("axios");

class PaddleService {
  constructor() {
    this.apiKey = process.env.PADDLE_API_KEY;
    this.environment = process.env.PADDLE_ENVIRONMENT || "sandbox";
    this.baseURL =
      this.environment === "production"
        ? "https://api.paddle.com"
        : "https://api-sandbox.paddle.com";

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });
  }

  // Initialize Paddle in frontend
  initPaddle() {
    if (typeof window !== "undefined" && !window.Paddle) {
      const PaddleJS = require("@paddle/paddle-js");
      const paddleInstance = PaddleJS.default || PaddleJS;

      paddleInstance.Environment.set(
        process.env.NEXT_PUBLIC_PADDLE_ENV || "sandbox"
      );
      paddleInstance.Initialize({
        token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
      });
      window.Paddle = paddleInstance;
    }
  }

  // Create checkout
  async createCheckout(items, customerInfo) {
    try {
      const response = await this.client.post("/checkout", {
        items: items,
        customer: {
          email: customerInfo.email,
          name: customerInfo.name,
        },
        custom_data: {
          userId: customerInfo.userId,
        },
      });

      return response.data;
    } catch (error) {
      console.error(
        "Paddle checkout error:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  // Verify webhook signature (simplified - you might need to implement proper verification)
  verifyWebhookSignature(signature, body) {
    // Paddle webhook verification logic
    // You'll need to implement this based on Paddle's webhook documentation
    // This is a placeholder implementation
    console.log("Webhook verification would happen here");
    return true;
  }

  // Get a customer (used to resolve their email from a webhook's customer_id)
  async getCustomer(customerId) {
    const response = await this.client.get(`/customers/${customerId}`);
    return response.data; // { data: { id, email, ... } }
  }

  // Get transaction details
  async getTransaction(transactionId) {
    try {
      const response = await this.client.get(`/transactions/${transactionId}`);
      return response.data;
    } catch (error) {
      console.error(
        "Error getting transaction:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  // Get subscription details — used to confirm a recurring plan when a
  // transaction belongs to a subscription (the authoritative "is it active"
  // signal for monthly/yearly).
  async getSubscription(subscriptionId) {
    try {
      const response = await this.client.get(`/subscriptions/${subscriptionId}`);
      return response.data; // { data: { id, status, items, current_billing_period, custom_data, customer_id, ... } }
    } catch (error) {
      console.error(
        "Error getting subscription:",
        error.response?.data || error.message
      );
      throw error;
    }
  }
}

const paddleService = new PaddleService();

module.exports = {
  paddle: paddleService,
  initPaddle: paddleService.initPaddle.bind(paddleService),
  createCheckout: paddleService.createCheckout.bind(paddleService),
  verifyWebhookSignature:
    paddleService.verifyWebhookSignature.bind(paddleService),
};
