const bcrypt = require("bcrypt");
const crypto = require("crypto");
const User = require("../models/User");
const Account = require("../models/Account");
const Trade = require("../models/Trade"); // new separate model
const EmailVerification = require("../models/EmailVerify");
const { sendOtpEmail } = require("../mail/sendOtpEmail");
const { sendLifecycleEmail, verifyUnsubToken } = require("../mail/lifecycleEmails");
const Plan = require("../models/Plan");
const getUserData = require("../utils/getUserData");
const axios = require("axios");
const { sendTelegramNotification } = require("../utils/telegramNotifier");
const { signAppToken } = require("../utils/appToken");

const detectCurrencyFromTimezone = (timezone) => {
  if (!timezone) return "USD";
  return timezone.includes("Asia/Kolkata") ? "INR" : "USD";
};

const SALT_ROUNDS = 10;

// App clients (native mobile) skip the web-only Turnstile and are gated by
// Google Play Integrity instead. TODO: verify a Play Integrity token here.
function isAppClient(req) {
  return req && req.headers && req.headers["x-app-client"] === "1";
}

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
        // They registered before but never verified. Refresh their details
        // and send a FRESH OTP so they can complete verification.
        if (!googleId) {
          if (password) existingUser.password = await bcrypt.hash(password, SALT_ROUNDS);
          if (name) existingUser.name = name;
          await existingUser.save();

          // replace any pending code with a new one
          await EmailVerification.deleteMany({ userId: existingUser._id });
          const otp = String(Math.floor(100000 + Math.random() * 900000));
          const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
          await EmailVerification.create({
            userId: existingUser._id,
            otpHash,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
            nextResendAllowedAt: new Date(Date.now() + 60 * 1000),
          });
          await sendOtpEmail({ to: existingUser.email, otp, name: existingUser.name });
        }

        return res.status(200).json({
          message: "Verification code sent. Please verify OTP.",
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
    const trialExpiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // ✅ Create new user — Pro active for 7 days (same as Google sign-up).
    const user = new User({
      name,
      email,
      password: hashedPassword,
      googleId: googleId || undefined,
      isVerified: false,
      subscriptionPlan: "pro",
      subscriptionStatus: "active",
      subscriptionType: "one-time",
      subscriptionStartAt: now,
      subscriptionExpiresAt: trialExpiry,
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
    if (!isAppClient(req)) {
      const isHuman = await verifyTurnstileToken(turnstileToken, req.ip);
      if (!isHuman)
        return res.status(403).json({
          message: "Captcha verification failed. Refresh and try again",
        });
    }

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
      token: signAppToken(user._id), // used by the mobile app; web ignores it
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
    const verifiedUser = await User.findByIdAndUpdate(
      userId,
      { isVerified: true, verifiedAt: new Date() },
      { new: true },
    );
    await EmailVerification.deleteOne({ _id: rec._id });

    // Fire the welcome email instantly (non-blocking). Only stamp welcomeAt on
    // success so the onboarding scheduler can retry if this send fails.
    if (verifiedUser && !verifiedUser.emailOptOut && !verifiedUser?.lifecycle?.welcomeAt) {
      sendLifecycleEmail("welcome", verifiedUser)
        .then((ok) => {
          if (ok) {
            return User.updateOne(
              { _id: userId, "lifecycle.welcomeAt": { $exists: false } },
              { $set: { "lifecycle.welcomeAt": new Date() } },
            );
          }
        })
        .catch(() => {});
    }

    // Optionally set cookie to log in immediately
    setUserIdCookie(res, userId);

    return res.json({ message: "Email verified", token: signAppToken(userId) });
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

    // Don't override an already-active plan (also prevents re-granting).
    if (user.subscriptionStatus === "active") {
      return res.json({
        message: "Already active",
        subscription: {
          plan: user.subscriptionPlan,
          status: user.subscriptionStatus,
          type: user.subscriptionType,
          startAt: user.subscriptionStartAt,
          expiresAt: user.subscriptionExpiresAt,
        },
      });
    }

    // Pro active for 7 days (no separate "trial" type — just a dated Pro plan)
    const now = new Date();
    const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    user.subscriptionPlan = "pro";
    user.subscriptionStatus = "active";
    user.subscriptionType = "one-time";
    user.subscriptionStartAt = now;
    user.subscriptionExpiresAt = expires;
    user.subscriptionCreatedAt = user.subscriptionCreatedAt || now;
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

// 🔹 v2: LOGIN WITH OTP — request a one-time code for an existing account
// (works for both password and Google accounts).
const requestLoginOtp = async (req, res) => {
  try {
    const { email, turnstileToken } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    if (!isAppClient(req)) {
      const isHuman = await verifyTurnstileToken(turnstileToken, req.ip);
      if (!isHuman)
        return res
          .status(403)
          .json({ message: "Captcha verification failed. Refresh and try again" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ message: "No account found with that email. Please register first." });
    }

    // throttle using the existing login record's cooldown
    const existing = await EmailVerification.findOne({
      userId: user._id,
      purpose: "login",
    });
    if (existing?.nextResendAllowedAt > new Date()) {
      return res
        .status(429)
        .json({ message: "Please wait a moment before requesting another code." });
    }
    if (existing) await EmailVerification.deleteOne({ _id: existing._id });

    const otp = await generateOTP();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    await EmailVerification.create({
      userId: user._id,
      otpHash,
      purpose: "login",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
      nextResendAllowedAt: new Date(Date.now() + 60 * 1000), // 60s cooldown
    });

    await sendOtpEmail({ to: user.email, otp, name: user.name });
    return res.json({ message: "Login code sent to your email", userId: user._id });
  } catch (err) {
    console.error("Login OTP request error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// 🔹 v2: LOGIN WITH OTP — verify the code and start a session
const verifyLoginOtp = async (req, res) => {
  try {
    const { userId, otp, turnstileToken } = req.body;
    if (!userId || !otp) return res.status(400).json({ message: "Code is required" });

    if (!isAppClient(req)) {
      const isHuman = await verifyTurnstileToken(turnstileToken, req.ip);
      if (!isHuman)
        return res
          .status(403)
          .json({ message: "Captcha verification failed. Refresh and try again" });
    }

    const rec = await EmailVerification.findOne({ userId, purpose: "login" });
    if (!rec)
      return res.status(400).json({ message: "No login request found — request a new code" });
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

    await EmailVerification.deleteOne({ _id: rec._id });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Account not found" });

    // a valid email code proves ownership → ensure the account is verified
    if (!user.isVerified) {
      user.isVerified = true;
      user.verifiedAt = new Date();
      await user.save();
    }

    setUserIdCookie(res, user._id);
    await sendTelegramNotification({
      name: user.name,
      email: user.email,
      type: "login",
      status: "success",
    });

    const userData = await getUserData(user);
    return res.json({
      message: "Login successful",
      isVerified: "yes",
      userData,
      token: signAppToken(user._id),
    });
  } catch (err) {
    console.error("Login OTP verify error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// 🔹 v2: NATIVE GOOGLE SIGN-IN (mobile app)
// The app obtains a Google ID token via @react-native-google-signin and posts
// it here. We verify it with Google, find/create the user (same defaults as
// the web OAuth flow), and return an app JWT + userData.
const googleNativeAuth = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: "idToken is required" });

    // verify the token directly with Google (no extra dependency needed)
    let payload;
    try {
      const { data } = await axios.get(
        "https://oauth2.googleapis.com/tokeninfo",
        { params: { id_token: idToken } },
      );
      payload = data;
    } catch {
      return res.status(401).json({ message: "Invalid Google token" });
    }

    const email = payload.email;
    const emailVerified = payload.email_verified === "true" || payload.email_verified === true;
    if (!email || !emailVerified) {
      return res.status(401).json({ message: "Google email not verified" });
    }

    // optional audience check against our known client IDs
    const allowedAud = [
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_ANDROID_CLIENT_ID,
      process.env.GOOGLE_WEB_CLIENT_ID,
    ].filter(Boolean);
    if (allowedAud.length && payload.aud && !allowedAud.includes(payload.aud)) {
      return res.status(401).json({ message: "Token audience mismatch" });
    }

    let user = await User.findOne({ email });
    let isNewUser = false;
    if (!user) {
      isNewUser = true;
      const now = new Date();
      const expiry = new Date(now);
      expiry.setDate(expiry.getDate() + 7);
      user = await User.create({
        name: payload.name || email.split("@")[0],
        email,
        googleId: payload.sub,
        subscriptionPlan: "pro",
        subscriptionStatus: "active",
        subscriptionType: "one-time",
        subscriptionStartAt: now,
        subscriptionExpiresAt: expiry,
        subscriptionCreatedAt: now,
        isVerified: true,
      });
      const defaultAccount = new Account({
        userId: user._id,
        name: "Default Journal",
        currency: "USD",
        startingBalance: { amount: 0, time: new Date() },
      });
      await defaultAccount.save();
    } else if (!user.googleId) {
      user.googleId = payload.sub;
      if (!user.isVerified) {
        user.isVerified = true;
        user.verifiedAt = new Date();
      }
      await user.save();
    }

    const userData = await getUserData(user);
    return res.json({
      message: "Login successful",
      isVerified: "yes",
      isNewUser,
      userData,
      token: signAppToken(user._id),
    });
  } catch (err) {
    console.error("Native Google auth error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

/* One-click unsubscribe from onboarding/lifecycle emails. Linked from the
   footer of every lifecycle email: /api/auth/email/unsubscribe?u=<id>&t=<token>.
   The token is an HMAC of the userId so no auth/session is needed. */
const unsubscribeEmails = async (req, res) => {
  const { u: userId, t: token } = req.query;
  const page = (title, msg) => `<!doctype html><html><head><meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title></head>
    <body style="margin:0;background:#f2f3f5;font-family:Poppins,Arial,sans-serif;">
      <div style="max-width:460px;margin:64px auto;background:#fff;border:1px solid #e6e8eb;border-radius:16px;padding:32px;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:#12161c;margin-bottom:14px;">Journal<span style="color:#f0b90b;">X</span></div>
        <h1 style="font-size:18px;color:#12161c;margin:0 0 8px;">${title}</h1>
        <p style="font-size:14px;color:#707a8a;line-height:1.6;margin:0;">${msg}</p>
        <a href="${(() => { const u = process.env.APP_PUBLIC_URL || process.env.CLIENT_URL; return (!u || /localhost|127\.0\.0\.1/i.test(u)) ? "https://journalx.app" : u.replace(/\/+$/, ""); })()}"
           style="display:inline-block;margin-top:20px;padding:11px 22px;background:#f0b90b;color:#1e2329;font-weight:600;text-decoration:none;border-radius:10px;">Back to JournalX</a>
      </div>
    </body></html>`;

  try {
    if (!verifyUnsubToken(userId, token)) {
      return res.status(400).send(page("Invalid link", "This unsubscribe link is invalid or has expired."));
    }
    await User.updateOne({ _id: userId }, { $set: { emailOptOut: true } });
    return res.send(page("You're unsubscribed", "You won't receive onboarding emails from JournalX anymore. Account and security emails (like verification codes) will still be sent."));
  } catch (err) {
    return res.status(500).send(page("Something went wrong", "We couldn't process your request. Please try again later."));
  }
};

module.exports = {
  registerUser,
  loginUser,
  checkAuthStatus,
  resendOtp,
  verifyOtp,
  unsubscribeEmails,
  requestLoginOtp,
  verifyLoginOtp,
  googleNativeAuth,
  userFetchGoogleAuth,
  updateSubscription,
  activateTrial,
  requestPasswordReset,
  resetPassword,
  // verifyUserFromCookie,
  // getFullUserData
  // verifyEmail
};
