// JWT helper for the mobile app (bearer-token auth). The web keeps using the
// httpOnly cookie; the app sends `Authorization: Bearer <token>` instead.
const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "";
const EXPIRES_IN = "60d";

function signAppToken(userId) {
  if (!SECRET) {
    console.warn("JWT_SECRET is not set — app tokens cannot be signed.");
    return null;
  }
  return jwt.sign({ userId: String(userId) }, SECRET, { expiresIn: EXPIRES_IN });
}

function verifyAppToken(token) {
  if (!SECRET || !token) return null;
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

module.exports = { signAppToken, verifyAppToken };
