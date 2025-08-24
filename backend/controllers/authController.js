const bcrypt = require('bcrypt');
const User = require('../models/User');
const Account = require('../models/Account');
const Trade = require('../models/Trade'); // new separate model
const SALT_ROUNDS = 10;

const isProduction = process.env.NODE_ENV === 'production';

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
};

const setUserIdCookie = (res, userId) => {
  res.cookie('userId', userId.toString(), cookieOptions);
};

const validateEmailCredentials = (email, password, res) => {
  if (!email || !password) {
    res.status(400).json({ message: 'All fields required' });
    return false;
  }
  return true;
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    console.log('🔁 Register endpoint triggered');

    if (!validateEmailCredentials(email, password, res)) return;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('❌ User already exists:', existingUser._id);
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Step 1: Create new user
    const user = new User({
      name,
      email,
      password: hashedPassword
    });
    await user.save();

    // Step 2: Create default account for the user
    const account = new Account({
      userId: user._id,
      name: "Default Account",
      currency: "USD",
      startingBalance: {
        amount: 0
      }
    });
    await account.save();

    console.log(`✅ User ${user._id} and default account ${account._id} created`);

    // Step 3: Set cookie
    setUserIdCookie(res, user._id);

    // Step 4: Send success response
    res.status(201).json({
      message: 'Registration successful.',
      userId: user._id,
      accountId: account._id
    });

  } catch (err) {
    console.error('🚨 Registration error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!validateEmailCredentials(email, password, res)) return;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid email or password" });

    console.log("✅ Login successful:", user._id);

    // 1️⃣ Set cookie with userId
    setUserIdCookie(res, user._id);

    // 2️⃣ Fetch all accounts + trades for the user
    const accounts = await Account.find({ userId: user._id }).lean();
    const trades = await Trade.find({ userId: user._id }).lean();

    // 3️⃣ Send back unified userData + isVerified status
    res.status(200).json({
      message: "Login successful",
      isVerified: user.isVerified ? "yes" : "no", // 🔑 Add this field
      userData: {
        userId: user._id,
        accounts,
        trades,
      },
    });
  } catch (err) {
    console.error("🚨 Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
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
    return res.status(401).json({ message: 'Not authenticated' });
  }

  return res.status(200).json({ message: 'Authenticated', userId });
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
  // verifyUserFromCookie,
  // getFullUserData
  // resetPassword,
  // requestPasswordReset,
  // verifyEmail
};
