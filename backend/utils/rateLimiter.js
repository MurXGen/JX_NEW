const rateLimit = require("express-rate-limit");

// Function to create a limiter with custom max requests per hour
const createLimiter = (maxRequests = 10) => {
  return rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: maxRequests,
    message: {
      status: 429,
      message: "Too many requests from this IP, please try again after an hour",
    },
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false, // Disable X-RateLimit-* headers
  });
};

module.exports = createLimiter;
