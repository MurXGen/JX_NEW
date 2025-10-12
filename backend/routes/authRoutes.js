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
    failureRedirect: `${process.env.CLIENT_URL}/login`,
  }),
  (req, res) => {
    // userId cookie (httpOnly)
    res.cookie("userId", req.user._id.toString(), {
      httpOnly: true, // secure from JS access
      secure: true, // must be HTTPS
      sameSite: "None", // crucial for cross-domain
      maxAge: 10 * 365 * 24 * 60 * 60 * 1000,
      domain: ".journalx.app", // allows cookie on subdomain
    });

    // isVerified cookie (frontend readable)
    res.cookie("isVerified", "yes", {
      httpOnly: false, // frontend can read
      secure: true,
      sameSite: "None",
      maxAge: 10 * 365 * 24 * 60 * 60 * 1000,
      domain: ".journalx.app",
    });

    // ✅ Redirect to frontend with optional query
    res.redirect(
      `${process.env.CLIENT_URL || "http://localhost:3000"}/accounts`
    );
  }
);

router.get("/user-info", userFetchGoogleAuth);

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
