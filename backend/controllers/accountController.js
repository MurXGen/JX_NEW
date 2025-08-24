const mongoose = require("mongoose");
const Account = require("../models/Account");
const User = require("../models/User");
const Trade = require("../models/Trade"); // 👈 make sure you have this model

// Create account
const createAccount = async (req, res) => {
  try {
    const { accountName, currency, balance } = req.body;
    const userId = req.cookies.userId;

    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // 1️⃣ Create new account
    const account = new Account({
      userId,
      name: accountName,
      currency: currency || "USD",
      startingBalance: {
        amount: balance || 0,
        time: new Date(),
      },
    });

    await account.save();

    // 2️⃣ Set cookie for current account
    res.cookie("accountId", account._id.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // 3️⃣ Fetch updated accounts + trades for this user
    const accounts = await Account.find({ userId }).lean();
    const trades = await Trade.find({ userId }).lean();

    // 4️⃣ Respond in the same format used by login
    res.status(201).json({
      message: "Account created successfully!",
      userData: {
        userId,
        accounts,
        trades,
      },
    });
  } catch (error) {
    console.error("❌ Error creating account:", error);
    res.status(500).json({ message: "Error creating account" });
  }
};


// // Fetch all accounts for a user
// const getUserAccounts = async (req, res) => {
//   try {
//     const userId = req.cookies.userId;
//     if (!userId) return res.status(401).json({ error: 'Not authenticated' });

//     const accounts = await Account.find({ userId }).lean();

//     res.json({
//       userId,
//       accounts
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Server error' });
//   }
// };

// const getCurrentAccount = async (req, res) => {
//   const userId = req.cookies.userId;
//   const accountId = req.cookies.accountId;

//   if (!userId || !accountId) {
//     return res.status(400).json({ message: 'Missing userId or accountId in cookies' });
//   }

//   try {
//     // ✅ Fetch the account directly and ensure it belongs to the logged-in user
//     const account = await Account.findOne({ _id: accountId, userId }).lean();

//     if (!account) {
//       return res.status(404).json({ message: 'Account not found or not yours' });
//     }

//     res.status(200).json({ account });
//   } catch (err) {
//     console.error('Error fetching account:', err);
//     res.status(500).json({ message: 'Server error' });
//   }
// };


// const submitFeedback = async (req, res) => {
//   const userId = req.cookies.userId;
//   const { feedback } = req.body;

//   if (!feedback) return res.status(400).json({ message: 'Feedback cannot be empty' });

//   try {
//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ message: 'User not found' });

//     if (!user.feedback) user.feedback = [];
//     user.feedback.push({ message: feedback });

//     await user.save();
//     res.status(200).json({ message: 'Feedback submitted' });
//   } catch (err) {
//     console.error('Error submitting feedback:', err);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// const deleteAccount = async (req, res) => {
//   const userId = req.cookies.userId;
//   const accountId = req.cookies.accountId;

//   try {
//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ message: 'User not found' });

//     // Delete the account
//     user.accounts.id(accountId).deleteOne();
//     await user.save();

//     // Send back full user data
//     res.status(200).json({ message: 'Account deleted successfully', user });
//   } catch (err) {
//     console.error('Error deleting account:', err);
//     res.status(500).json({ message: 'Server error' });
//   }
// };


// const logout = (req, res) => {
//   res.clearCookie('userId');
//   res.clearCookie('accountId');
//   res.status(200).json({ message: 'Logged out successfully' });
// };


module.exports = { createAccount };
