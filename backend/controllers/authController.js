const bcrypt = require("bcrypt");
const crypto = require("crypto");
const User = require("../models/User");
const Account = require("../models/Account");
const Trade = require("../models/Trade"); // new separate model
const EmailVerification = require("../models/EmailVerify");
const { sendOtpEmail } = require("../mail/sendOtpEmail");
const Plan = require("../models/Plan");
const getUserData = require("../utils/getUserData");
const axios = require("axios");
const { sendTelegramNotification } = require("../utils/telegramNotifier");

const detectCurrencyFromTimezone = (timezone) => {
  if (!timezone) return "USD";
  return timezone.includes("Asia/Kolkata") ? "INR" : "USD";
};

const SALT_ROUNDS = 10;

async function verifyTurnstileToken(token, ip) {
  if (!token) return false;

  try {
    const response = await axios.post(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: ip || "",
      }).toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );

    return response.data.success === true;
  } catch (err) {
    return false;
  }
}

const isProduction = process.env.NODE_ENV === "production";

const cookieOptions = {
  httpOnly: true,
  secure: isProduction, // only true in production
  sameSite: isProduction ? "none" : "lax", // ✅ allow cross-site cookies in production
  maxAge: 10 * 365 * 24 * 60 * 60 * 1000,
};

const setUserIdCookie = (res, userId) => {
  res.cookie("userId", userId.toString(), cookieOptions);
};

async function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6-digit numeric
}

const validateEmailCredentials = (email, password, res) => {
  if (!email || !password) {
    res.status(400).json({ message: "All fields required" });
    return false;
  }
  return true;
};

// 🔹 REGISTER USER
const registerUser = async (req, res) => {
  const { name, email, password, googleId, turnstileToken, timezone } =
    req.body;

  try {
    // ✅ Verify Cloudflare Turnstile
    const isHuman = await verifyTurnstileToken(turnstileToken, req.ip);
    if (!isHuman)
      return res.status(403).json({ message: "Captcha verification failed" });

    if (!googleId && (!email || !password))
      return res.status(400).json({ message: "Email and password required" });

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (!existingUser.isVerified) {
        return res.status(200).json({
          message: "User exists but not verified. Please verify OTP.",
          userId: existingUser._id,
          isVerified: false,
        });
      }
      return res
        .status(409)
        .json({ message: "User already exists. Please login." });
    }

    const hashedPassword = password
      ? await bcrypt.hash(password, SALT_ROUNDS)
      : undefined;

    const now = new Date();

    // ✅ Create new user — starts on the FREE plan (limits apply).
    // Upgrade to Pro/Lifetime happens via checkout.
    const user = new User({
      name,
      email,
      password: hashedPassword,
      googleId: googleId || undefined,
      isVerified: false,
      subscriptionPlan: "free",
      subscriptionStatus: "none",
      subscriptionType: undefined,
      subscriptionStartAt: undefined,
      subscriptionExpiresAt: undefined,
      subscriptionCreatedAt: now,
    });
    await user.save();

    const isIndiaTimezone = (tz = "") =>
      tz.toLowerCase().includes("asia/kolkata") ||
      tz.toLowerCase().includes("asia/calcutta");

    const currency = isIndiaTimezone(timezone) ? "INR" : "USD";

    const defaultAccount = new Account({
      userId: user._id,
      name: "Default Journal",
      currency,
      startingBalance: {
        amount: 0,
        time: new Date(),
      },
    });

    await defaultAccount.save();

    // ✅ Set accountId cookie
    res.cookie("accountId", defaultAccount._id.toString(), {
      sameSite: isProduction ? "none" : "lax",
      secure: isProduction,
      maxAge: 10 * 365 * 24 * 60 * 60 * 1000,
    });

    // ✅ Send OTP if not Google
    if (!googleId) {
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

      await EmailVerification.create({
        userId: user._id,
        otpHash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        nextResendAllowedAt: new Date(Date.now() + 60 * 1000),
      });

      await sendOtpEmail({ to: user.email, otp, name: user.name });
    }

    // ✅ Notify Telegram
    await sendTelegramNotification({
      name,
      email,
      type: "register",
      status: "success",
    });

    return res.status(201).json({
      message: googleId
        ? "Registered via Google. Default journal created."
        : "Registered. Check email for OTP.",
      userId: user._id,
      isVerified: false,
      defaultAccountId: defaultAccount._id,
      currency,
    });
  } catch (err) {
    console.error("Register Error:", err.message);

    await sendTelegramNotification({
      name: name || "N/A",
      email: email || "N/A",
      type: "register",
      status: "failure",
    });

    res.status(500).json({ message: "Server error" });
  }
};

// 🔹 LOGIN USER
const loginUser = async (req, res) => {
  const { email, password, turnstileToken } = req.body;

  try {
    const isHuman = await verifyTurnstileToken(turnstileToken, req.ip);
    if (!isHuman)
      return res.status(403).json({
        message: "Captcha verification failed. Refresh and try again",
      });

    if (!validateEmailCredentials(email, password, res)) return;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ message: "Invalid email or password" });

    if (!user.password)
      return res.status(400).json({ message: "Google account login only." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid email or password" });

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your account via OTP before logging in.",
        userId: user._id,
      });
    }

    // ✅ Set cookie + send Telegram success
    setUserIdCookie(res, user._id);

    await sendTelegramNotification({
      name: user.name,
      email: user.email,
      type: "login",
      status: "success",
    });

    const userData = await getUserData(user);
    res.status(200).json({
      message: "Login successful",
      isVerified: "yes",
      userData,
    });
  } catch (err) {
    console.error("Login Error:", err.message);

    await sendTelegramNotification({
      name: "N/A",
      email: email || "N/A",
      type: "login",
      status: "failure",
    });

    res.status(500).json({ message: "Server error" });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { userId, otp } = req.body;
    const rec = await EmailVerification.findOne({ userId, purpose: "verify" });

    if (!rec)
      return res.status(400).json({ message: "No verification request found" });
    if (rec.expiresAt < new Date()) {
      await EmailVerification.deleteOne({ _id: rec._id });
      return res.status(400).json({ message: "OTP expired" });
    }

    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    if (otpHash !== rec.otpHash) {
      rec.attempts = (rec.attempts || 0) + 1;
      await rec.save();
      if (rec.attempts >= 5) {
        await EmailVerification.deleteOne({ _id: rec._id });
        return res.status(429).json({ message: "Too many attempts" });
      }
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Mark verified
    await User.findByIdAndUpdate(userId, {
      isVerified: true,
      verifiedAt: new Date(),
    });
    await EmailVerification.deleteOne({ _id: rec._id });

    // Optionally set cookie to log in immediately
    setUserIdCookie(res, userId);

    return res.json({ message: "Email verified" });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

const resendOtp = async (req, res) => {
  const { userId } = req.body;
  const rec = await EmailVerification.findOne({ userId, purpose: "verify" });
  if (!rec)
    return res.status(400).json({ message: "No verification in progress" });

  // Check resend attempts
  if (rec.resendCount >= 3) {
    return res.status(429).json({ message: "Resend limit reached" });
  }

  // Check cooldown
  if (rec.nextResendAllowedAt && rec.nextResendAllowedAt > new Date()) {
    return res.status(429).json({ message: "Please wait before resending" });
  }

  // Generate new OTP
  const otp = await generateOTP();
  rec.otpHash = crypto.createHash("sha256").update(otp).digest("hex");
  rec.expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry
  rec.nextResendAllowedAt = new Date(Date.now() + 60 * 1000); // 60s cooldown
  rec.resendCount = (rec.resendCount || 0) + 1; // increment count
  await rec.save();

  const user = await User.findById(userId);
  await sendOtpEmail({ to: user.email, otp, name: user.name });

  return res.json({
    message: "OTP resent",
    remaining: 3 - rec.resendCount, // send remaining attempts info
  });
};

const userFetchGoogleAuth = async (req, res) => {
  try {
    const userId = req.cookies.userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    const userData = await getUserData(user);

    res.json({
      message: "User info fetched",
      userData,
      user,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

const updateSubscription = async (req, res) => {
  try {
    const userId = req.cookies.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { subscriptionType, subscriptionPlan, subscriptionStatus } = req.body;
    if (!subscriptionType || !subscriptionPlan || !subscriptionStatus) {
      return res.status(400).json({ message: "Missing subscription fields" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        subscriptionType,
        subscriptionPlan,
        subscriptionStatus,
        subscriptionStartAt: null,
        subscriptionExpiresAt: null,
      },
      { new: true },
    ).lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Subscription updated", user });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// const getFullUserData = async (req, res) => {
//   try {
//     const { userId } = req.cookies;
//
//     if (!userId) {
//       //       return res.status(401).json({ message: 'User not authenticated' });
//     }

//     // Fetch all accounts for this user
//     const accounts = await Account.find({ userId }).lean();
//     //     if (accounts.length > 0) {
//       console.log("📄 Accounts:", accounts.map(acc => ({
//         id: acc._id,
//         name: acc.name,
//         currency: acc.currency
//       })));
//     }

//     if (!accounts.length) {
//       //       return res.status(200).json({
//         userId,
//         accounts: [],
//         trades: []
//       });
//     }

//     // Get all trades for the fetched accounts
//     const accountIds = accounts.map(acc => acc._id);
//
//     const trades = await Trade.find({ accountId: { $in: accountIds } }).lean();
//
//     res.status(200).json({
//       userId,
//       accounts,
//       trades
//     });

//   } catch (err) {
//     //     res.status(500).json({ message: 'Server error' });
//   }
// };

const checkAuthStatus = (req, res) => {
  const userId = req.cookies.userId;

  if (!userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  return res.status(200).json({ message: "Authenticated", userId });
};

// const verifyUserFromCookie = async (req, res) => {
//   try {
//     const userId = req.cookies.userId;

//     if (!userId) {
//       return res.status(401).json({ message: 'No user ID in cookies' });
//     }

//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(401).json({ message: 'Invalid user' });
//     }

//     return res.status(200).json({ valid: true });
//   } catch (error) {
//     return res.status(500).json({ message: 'Server error', error });
//   }
// };

// In your auth controller
// const verifyEmail = async (req, res) => {
//   const { token } = req.query;

//   if (!token) return res.status(400).json({ message: 'Verification token is missing' });

//   const user = await User.findOne({
//     verificationToken: token,
//     verificationTokenExpiry: { $gt: Date.now() },
//   });

//   if (!user) {
//     return res.status(400).json({ message: 'Invalid or expired verification link' });
//   }

//   user.emailVerified = true;
//   user.verificationToken = undefined;
//   user.verificationTokenExpiry = undefined;
//   await user.save();

//   res.status(200).json({ message: 'Email verified successfully' });
// };

// const requestPasswordReset = async (req, res) => {
//   const { email } = req.body;
//   if (!email) return res.status(400).json({ message: 'Email is required' });

//   const user = await User.findOne({ email });
//   if (!user) return res.status(200).json({ message: 'If this email exists, a reset link has been sent' });

//   const token = crypto.randomBytes(32).toString('hex');
//   user.resetPasswordToken = token;
//   user.resetPasswordExpiry = Date.now() + 3600000; // 1 hour
//   await user.save();

//   const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

//   await resend.emails.send({
//     from: 'NutriWings <onboarding@onresend.com>',
//     to: email,
//     subject: 'Reset your password',
//     html: `<p>You requested a password reset:</p>
//            <a href="${resetUrl}">Click here to reset password</a>
//            <p>This link is valid for 1 hour.</p>`
//   });

//   res.status(200).json({ message: 'If this email exists, a reset link has been sent' });
// };

// const resetPassword = async (req, res) => {
//   const { token, newPassword } = req.body;

//   if (!token || !newPassword) return res.status(400).json({ message: 'Missing data' });

//   const user = await User.findOne({
//     resetPasswordToken: token,
//     resetPasswordExpiry: { $gt: Date.now() }
//   });

//   if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

//   const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
//   user.password = hashed;
//   user.resetPasswordToken = undefined;
//   user.resetPasswordExpiry = undefined;
//   await user.save();

//   res.status(200).json({ message: 'Password reset successful' });
// };

// 🔹 v2: FORGOT PASSWORD — email an OTP (purpose: "reset")
const requestPasswordReset = async (req, res) => {
  const { email } = req.body;
  /* always answer the same way so emails can't be enumerated */
  const generic = {
    message: "If that email exists, a reset code is on its way.",
  };
  try {
    if (!email) return res.status(400).json({ message: "Email required" });

    const user = await User.findOne({ email });
    if (!user || !user.password) return res.json(generic);

    /* throttle: reuse existing record cooldowns */
    const existing = await EmailVerification.findOne({
      userId: user._id,
      purpose: "reset",
    });
    if (existing?.nextResendAllowedAt > new Date()) {
      return res.json(generic);
    }
    if (existing) await EmailVerification.deleteOne({ _id: existing._id });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    await EmailVerification.create({
      userId: user._id,
      otpHash,
      purpose: "reset",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
      nextResendAllowedAt: new Date(Date.now() + 60 * 1000),
    });

    await sendOtpEmail({ to: user.email, otp, name: user.name });
    return res.json(generic);
  } catch (err) {
    console.error("Forgot password error:", err.message);
    return res.json(generic);
  }
};

// 🔹 v2: RESET PASSWORD — verify OTP + set new password
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (String(newPassword).length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid code" });

    const rec = await EmailVerification.findOne({
      userId: user._id,
      purpose: "reset",
    });
    if (!rec) return res.status(400).json({ message: "Invalid or expired code" });
    if (rec.expiresAt < new Date()) {
      await EmailVerification.deleteOne({ _id: rec._id });
      return res.status(400).json({ message: "Code expired — request a new one" });
    }

    const otpHash = crypto.createHash("sha256").update(String(otp)).digest("hex");
    if (otpHash !== rec.otpHash) {
      rec.attempts = (rec.attempts || 0) + 1;
      await rec.save();
      if (rec.attempts >= 5) {
        await EmailVerification.deleteOne({ _id: rec._id });
        return res.status(429).json({ message: "Too many attempts — request a new code" });
      }
      return res.status(400).json({ message: "Invalid code" });
    }

    user.password = await bcrypt.hash(String(newPassword), SALT_ROUNDS);
    await user.save();
    await EmailVerification.deleteOne({ _id: rec._id });

    return res.json({ message: "Password reset — you can log in now" });
  } catch (err) {
    console.error("Reset password error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Activate the one-time 7-day Pro trial (called when onboarding completes).
// Only grants it if the user has never had a subscription/trial before.
const activateTrial = async (req, res) => {
  try {
    const userId = req.cookies.userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Don't override an active paid plan or re-grant a used trial.
    if (user.subscriptionStatus === "active" || user.trialUsed) {
      return res.json({
        message: "Trial not applied",
        subscription: {
          plan: user.subscriptionPlan,
          status: user.subscriptionStatus,
          type: user.subscriptionType,
          startAt: user.subscriptionStartAt,
          expiresAt: user.subscriptionExpiresAt,
        },
      });
    }

    const now = new Date();
    const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    user.subscriptionPlan = "pro";
    user.subscriptionStatus = "active";
    user.subscriptionType = "trial";
    user.subscriptionStartAt = now;
    user.subscriptionExpiresAt = expires;
    user.subscriptionCreatedAt = user.subscriptionCreatedAt || now;
    user.trialUsed = true;
    await user.save();

    res.json({
      message: "Trial activated",
      subscription: {
        plan: user.subscriptionPlan,
        status: user.subscriptionStatus,
        type: user.subscriptionType,
        startAt: user.subscriptionStartAt,
        expiresAt: user.subscriptionExpiresAt,
      },
    });
  } catch (err) {
    console.error("activateTrial error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  registerUser,
  loginUser,
  checkAuthStatus,
  resendOtp,
  verifyOtp,
  userFetchGoogleAuth,
  updateSubscription,
  activateTrial,
  requestPasswordReset,
  resetPassword,
  // verifyUserFromCookie,
  // getFullUserData
  // verifyEmail
};
