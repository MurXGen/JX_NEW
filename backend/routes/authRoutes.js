const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  verifyOtp,
  resendOtp,
} = require("../controllers/authController");
require("../utils/passport");
const passport = require("passport");

// 📌 Email/Password Registration
router.post("/register", registerUser);

// 📌 Email/Password Login
router.post("/login", loginUser);

router.post("/verify-otp", verifyOtp);

router.post("/resend-otp", resendOtp);

// 📌 Trigger Google OAuth flow
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// 📌 Google OAuth Callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login",
  }),
  (req, res) => {
    // ✅ Set userId cookie
    res.cookie("userId", req.user._id.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 365 * 24 * 60 * 60 * 1000, // 10 years
    });

    // ✅ Set isVerified cookie (same as email login flow)
    res.cookie("isVerified", "yes", {
      httpOnly: false, // frontend should read it
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 10 * 365 * 24 * 60 * 60 * 1000,
    });

    // ✅ Redirect to frontend with optional query
    res.redirect(
      `${process.env.CLIENT_URL || "http://localhost:3000"}/accounts`
    );
  }
);

// router.get('/full', getFullUserData);

// router.get('/check-auth', checkAuthStatus);
// router.get('/verify', verifyUserFromCookie);
// router.get('/full', getFullUserData);

// After Domain
// router.post('/request-password-reset', requestPasswordReset);
// router.post('/reset-password', resetPassword);
// router.get('/verify-email', verifyEmail);

module.exports = router;
