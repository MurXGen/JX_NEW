const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  verifyOtp,
  resendOtp,
  requestLoginOtp,
  verifyLoginOtp,
  googleNativeAuth,
  userFetchGoogleAuth,
  updateSubscription,
  activateTrial,
  requestPasswordReset,
  resetPassword,
  unsubscribeEmails,
} = require("../controllers/authController");
require("../utils/passport");
const passport = require("passport");
const { sendTelegramNotification } = require("../utils/telegramNotifier");
const createLimiter = require("../utils/rateLimiter");
const Account = require("../models/Account");

// v2 profile update (avatar → Backblaze)
const multer = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { deleteImageFromB2 } = require("../utils/backblaze");
const User = require("../models/User");

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

const s3Profile = new S3Client({
  region: process.env.B2_REGION,
  endpoint: process.env.B2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.B2_KEY_ID,
    secretAccessKey: process.env.B2_APP_KEY,
  },
});

// 📌 Email/Password Registration
router.post("/register", registerUser);

// 📌 Email/Password Login
router.post("/login", loginUser);

router.post("/verify-otp", verifyOtp);

router.post("/resend-otp", resendOtp);

// 📌 v2: Passwordless login via email OTP (existing accounts, manual or Google)
router.post("/login-otp/request", createLimiter(10), requestLoginOtp);
router.post("/login-otp/verify", createLimiter(20), verifyLoginOtp);

// 📌 Mobile app: native Google sign-in (verifies Google ID token → app JWT)
router.post("/google/native", createLimiter(20), googleNativeAuth);

// 📌 v2: Forgot / reset password (OTP over email)
router.post("/forgot-password", createLimiter(10), requestPasswordReset);
router.post("/reset-password", createLimiter(10), resetPassword);

// 📌 Activate the one-time 7-day Pro trial (onboarding completion)
router.post("/activate-trial", activateTrial);

// 📌 One-click unsubscribe from onboarding/lifecycle emails (token-signed link)
router.get("/email/unsubscribe", unsubscribeEmails);

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

      const base = process.env.CLIENT_URL || "http://localhost:3000";
      const newUserFlag = req.user?.isNewUser ? "&newUser=1" : "";
      res.redirect(`${base}/dashboard?isVerified=yes${newUserFlag}`);
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

// 📌 v2: Update profile — name, base currency, avatar (email is immutable)
router.put("/update-profile", avatarUpload.single("avatar"), async (req, res) => {
  try {
    const userId = req.cookies.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (typeof req.body.name === "string" && req.body.name.trim()) {
      user.name = req.body.name.trim();
    }
    if (typeof req.body.baseCurrency === "string" && req.body.baseCurrency.trim()) {
      user.baseCurrency = req.body.baseCurrency.trim().toUpperCase();
    }

    // avatar upload → Backblaze (replaces previous one)
    if (req.file) {
      if (!req.file.mimetype.startsWith("image/")) {
        return res.status(400).json({ success: false, message: "Avatar must be an image" });
      }
      const safeName = req.file.originalname.replace(/\s+/g, "_");
      const key = `trades/avatars/${userId}-${Date.now()}-${safeName}`;
      await s3Profile.send(
        new PutObjectCommand({
          Bucket: process.env.B2_BUCKET,
          Key: key,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
        })
      );
      const oldUrl = user.avatarUrl;
      user.avatarUrl = `https://cdn.journalx.app/${key}`;
      user.avatarSizeKB = Math.round(req.file.size / 1024);
      if (oldUrl) deleteImageFromB2(oldUrl); // async cleanup
    }

    await user.save();

    res.json({
      success: true,
      message: "Profile updated",
      profile: {
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        baseCurrency: user.baseCurrency,
      },
    });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ success: false, message: "Profile update failed" });
  }
});

// router.get('/full', getFullUserData);

// router.get('/check-auth', checkAuthStatus);
// router.get('/verify', verifyUserFromCookie);
// router.get('/full', getFullUserData);

// 📣 Save where the user heard about JournalX (onboarding ask)
router.post("/acquisition", async (req, res) => {
  try {
    const userId = req.cookies.userId;
    if (!userId) return res.status(401).json({ message: "Not signed in" });
    const source = String(req.body?.source || "").trim().slice(0, 40);
    const detail = String(req.body?.detail || "").trim().slice(0, 200);
    if (!source) return res.status(400).json({ message: "source is required" });
    await User.updateOne(
      { _id: userId },
      { $set: { acquisition: { source, detail, at: new Date() } } },
    );
    res.json({ ok: true });
  } catch (e) {
    console.error("acquisition save failed:", e?.message || e);
    res.status(500).json({ message: "Could not save" });
  }
});

// After Domain
// router.post('/request-password-reset', requestPasswordReset);
// router.post('/reset-password', resetPassword);
// router.get('/verify-email', verifyEmail);

module.exports = router;
