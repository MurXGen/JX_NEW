const pricingConfig = {
  pro: {
    monthly: {
      india: 0, // Free for India
      international: 0, // Free internationally
    },
    yearly: {
      india: 2,
      international: 4,
    },
    lifetime: {
      india: 99,
      international: 198,
    },
  },
  elite: {
    monthly: {
      india: 3.49,
      international: 6.98,
    },
    yearly: {
      india: 2 * 12, // $24 yearly
      international: 4 * 12, // $48 yearly
    },
  },
};

// Paddle Product IDs (you'll get these from your Paddle dashboard)
const paddleProductIds = {
  pro_monthly: process.env.PADDLE_PRO_MONTHLY_ID,
  pro_yearly: process.env.PADDLE_PRO_YEARLY_ID,
  pro_lifetime: process.env.PADDLE_PRO_LIFETIME_ID,
  elite_monthly: process.env.PADDLE_ELITE_MONTHLY_ID,
  elite_yearly: process.env.PADDLE_ELITE_YEARLY_ID,
};

const getPrice = (plan, type, country = "international") => {
  const normalizedCountry =
    country.toLowerCase() === "india" ? "india" : "international";
  return pricingConfig[plan]?.[type]?.[normalizedCountry] || 0;
};

const getPaddleProductId = (plan, type) => {
  const key = `${plan}_${type}`;
  return paddleProductIds[key];
};

module.exports = {
  pricingConfig,
  getPrice,
  getPaddleProductId,
};
