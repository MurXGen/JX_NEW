const bcrypt = require("bcrypt");
const crypto = require("crypto");
const User = require("../models/User");
const Account = require("../models/Account");
const Trade = require("../models/Trade"); // new separate model
const EmailVerification = require("../models/EmailVerify");
const { sendOtpEmail } = require("../mail/sendOtpEmail");

const SALT_ROUNDS = 10;
const isProduction = process.env.NODE_ENV === "production";

const cookieOptions = {
  httpOnly: true,
  secure: isProduction, // secure only in production
  sameSite: "lax",
  maxAge: 10 * 365 * 24 * 60 * 60 * 1000, // 10 years in ms
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

const registerUser = async (req, res) => {
  try {
    const { name, email, password, googleId } = req.body;

    if (!googleId && (!email || !password))
      return res.status(400).json({ message: "Email and password required" });

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      if (!existingUser.isVerified) {
        // User exists but not verified → return info to frontend
        return res.status(200).json({
          message: "User exists but not verified. Please verify OTP.",
          userId: existingUser._id,
          isVerified: false,
        });
      } else {
        // User exists and verified → redirect to login
        return res.status(409).json({
          message: "User already exists. Please login.",
          isVerified: true,
        });
      }
    }

    const hashedPassword = password
      ? await bcrypt.hash(password, SALT_ROUNDS)
      : undefined;

    const user = new User({
      name,
      email,
      password: hashedPassword,
      googleId: googleId || undefined,
      isVerified: false,
    });
    await user.save();

    // Generate OTP
    const otp = await generateOTP();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    // OTP expires after 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // User can only resend after 60s
    const nextResendAllowedAt = new Date(Date.now() + 60 * 1000);

    await EmailVerification.create({
      userId: user._id,
      otpHash,
      expiresAt,
      nextResendAllowedAt,
    });

    // Send OTP email
    await sendOtpEmail({ to: user.email, otp, name: user.name });

    return res
      .status(201)
      .json({ message: "Registered. Check email for OTP.", userId: user._id });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
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

    // ✅ Set cookie before sending response
    setUserIdCookie(res, user._id);

    const accounts = await Account.find({ userId: user._id }).lean();
    const trades = await Trade.find({ userId: user._id }).lean();

    res.status(200).json({
      message: "Login successful",
      isVerified: "yes",
      userData: {
        userId: user._id,
        name: user.name,
        email: user.email,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionExpiresAt: user.subscriptionExpiresAt,
        accounts,
        trades,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { userId, otp } = req.body;
    const rec = await EmailVerification.findOne({ userId });

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
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

const resendOtp = async (req, res) => {
  const { userId } = req.body;
  const rec = await EmailVerification.findOne({ userId });
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

// const getFullUserData = async (req, res) => {
//   try {
//     const { userId } = req.cookies;
//     console.log("🔍 getFullUserData() called — Cookie userId:", userId);

//     if (!userId) {
//       console.warn("⚠ No userId in cookies — user not authenticated");
//       return res.status(401).json({ message: 'User not authenticated' });
//     }

//     // Fetch all accounts for this user
//     const accounts = await Account.find({ userId }).lean();
//     console.log(`📂 Found ${accounts.length} account(s) for userId ${userId}`);
//     if (accounts.length > 0) {
//       console.log("📄 Accounts:", accounts.map(acc => ({
//         id: acc._id,
//         name: acc.name,
//         currency: acc.currency
//       })));
//     }

//     if (!accounts.length) {
//       console.warn("⚠ No accounts found for this user");
//       return res.status(200).json({
//         userId,
//         accounts: [],
//         trades: []
//       });
//     }

//     // Get all trades for the fetched accounts
//     const accountIds = accounts.map(acc => acc._id);
//     console.log("🆔 Account IDs for trade lookup:", accountIds);

//     const trades = await Trade.find({ accountId: { $in: accountIds } }).lean();
//     console.log(`📊 Found ${trades.length} trade(s) for these accounts`);

//     res.status(200).json({
//       userId,
//       accounts,
//       trades
//     });

//   } catch (err) {
//     console.error('🚨 Error fetching full user data:', err);
//     res.status(500).json({ message: 'Server error' });
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

module.exports = {
  registerUser,
  loginUser,
  checkAuthStatus,
  resendOtp,
  verifyOtp,
  // verifyUserFromCookie,
  // getFullUserData
  // resetPassword,
  // requestPasswordReset,
  // verifyEmail
};
