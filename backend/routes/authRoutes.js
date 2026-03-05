const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  verifyOtp,
  resendOtp,
  userFetchGoogleAuth,
  updateSubscription,
} = require("../controllers/authController");
require("../utils/passport");
const passport = require("passport");
const { sendTelegramNotification } = require("../utils/telegramNotifier");
const createLimiter = require("../utils/rateLimiter");
const Account = require("../models/Account");

// 📌 Email/Password Registration
router.post("/register", registerUser);

// 📌 Email/Password Login
router.post("/login", loginUser);

router.post("/verify-otp", verifyOtp);

router.post("/resend-otp", resendOtp);

// 📌 Trigger Google OAuth flow
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/login`,
  }),
  async (req, res) => {
    try {
      res.cookie("userId", req.user._id.toString(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
        maxAge: 10 * 365 * 24 * 60 * 60 * 1000,
      });

      // ✅ Get user's default account
      const account = await Account.findOne({ userId: req.user._id });

      if (account) {
        res.cookie("accountId", account._id.toString(), {
          sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
          secure: process.env.NODE_ENV === "production",
          maxAge: 10 * 365 * 24 * 60 * 60 * 1000,
        });
      }

      await sendTelegramNotification({
        name: req.user.name || "N/A",
        email: req.user.email || "N/A",
        type: "login",
        status: "success",
      });

      const redirectUrl = `${
        process.env.CLIENT_URL || "http://localhost:3000"
      }/accounts?isVerified=yes`;

      res.redirect(redirectUrl);
    } catch (err) {
      console.error("Google OAuth Error:", err.message);

      await sendTelegramNotification({
        name: req.user?.name || "N/A",
        email: req.user?.email || "N/A",
        type: "login",
        status: "failure",
      });

      res.redirect(`${process.env.CLIENT_URL}/login?error=google_auth_failed`);
    }
  },
);

router.get("/user-info", createLimiter(20), userFetchGoogleAuth);

router.put("/update-subscription", updateSubscription);

// router.get('/full', getFullUserData);

// router.get('/check-auth', checkAuthStatus);
// router.get('/verify', verifyUserFromCookie);
// router.get('/full', getFullUserData);

// After Domain
// router.post('/request-password-reset', requestPasswordReset);
// router.post('/reset-password', resetPassword);
// router.get('/verify-email', verifyEmail);

module.exports = router;
