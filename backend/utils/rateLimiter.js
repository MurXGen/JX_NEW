const rateLimit = require("express-rate-limit");

const createLimiter = (maxRequests = 10) => {
  return rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: maxRequests,

    message: {
      status: 429,
      message: "Too many requests from this IP, please try again after an hour",
    },

    standardHeaders: true,
    legacyHeaders: false,

    // 🔥 This logs when the IP hits the limit
    handler: (req, res, next, options) => {
      console.log(
        `🚨 Rate limit reached for IP: ${req.ip} | Route: ${req.originalUrl} | Limit: ${maxRequests}/hour`
      );

      res.status(options.statusCode).json(options.message);
    },
  });
};

module.exports = createLimiter;
