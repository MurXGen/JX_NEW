// If the request carries a valid app JWT (Authorization: Bearer <token>),
// populate req.cookies.userId from it so existing controllers — which read
// req.cookies.userId — work unchanged for the mobile app. The web cookie flow
// is untouched: if no bearer token is present, we just call next().
const { verifyAppToken } = require("../utils/appToken");

module.exports = function bearerToCookie(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    if (header.startsWith("Bearer ")) {
      const decoded = verifyAppToken(header.slice(7).trim());
      if (decoded && decoded.userId) {
        req.cookies = req.cookies || {};
        if (!req.cookies.userId) req.cookies.userId = decoded.userId;
        req.isAppClient = true;
      }
    }
  } catch {
    /* invalid token → fall back to cookie / guest */
  }
  next();
};
