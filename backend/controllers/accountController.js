const mongoose = require("mongoose");
const Account = require("../models/Account");
const User = require("../models/User");
const Trade = require("../models/Trade");
const Plan = require("../models/Plan");
const getUserData = require("../utils/getUserData");

const createAccount = async (req, res) => {
  try {
    const { accountName, currency, balance } = req.body;
    const userId = req.cookies.userId;

    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!accountName || !currency || balance === undefined) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (isNaN(balance)) {
      return res
        .status(400)
        .json({ message: "Balance must be a valid number" });
    }

    // ✅ Create new account
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

    // ✅ Set cookie
    res.cookie("accountId", account._id.toString(), {
      sameSite: "lax",
      maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day in milliseconds
    });

    const user = await User.findById(userId);
    const userData = await getUserData(user);

    res.status(201).json({
      message: "Account created successfully!",
      userData,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error: could not create account" });
  }
};

const updateAccount = async (req, res) => {
  try {
    const { accountId, accountName, currency, balance } = req.body;
    const userId = req.cookies.userId;

    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!accountId) {
      return res
        .status(400)
        .json({ message: "Account ID is required for update" });
    }

    if (!accountName || !currency || balance === undefined) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const account = await Account.findOne({ _id: accountId, userId });
    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    account.name = accountName;
    account.currency = currency;
    account.startingBalance.amount = balance;

    await account.save();

    // ✅ Set cookie again if needed
    res.cookie("accountId", account._id.toString(), {
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    const user = await User.findById(userId);
    const userData = await getUserData(user);

    res.status(200).json({
      message: "Account updated successfully!",
      userData,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error: could not update account" });
  }
};

const deactivateAccount = async (req, res) => {
  try {
    const { accountId } = req.body;
    const userId = req.cookies.userId;

    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!accountId) {
      return res.status(400).json({ message: "Account ID is required" });
    }

    // 🔹 Find account
    const account = await Account.findOne({ _id: accountId, userId });
    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    // 🔹 Delete account
    await Account.deleteOne({ _id: accountId, userId });

    // 🔹 Remove cookie if that account was active
    const activeAccountId = req.cookies.accountId;
    if (activeAccountId === accountId) {
      res.clearCookie("accountId");
    }

    const user = await User.findById(userId);
    const userData = await getUserData(user);

    res.status(200).json({
      message: "🗑️ Account deactivated successfully!",
      userData,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Server error: could not deactivate account" });
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
//     //     res.status(500).json({ error: 'Server error' });
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
//     //     res.status(500).json({ message: 'Server error' });
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
//     //     res.status(500).json({ message: 'Server error' });
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
//     //     res.status(500).json({ message: 'Server error' });
//   }
// };

// const logout = (req, res) => {
//   res.clearCookie('userId');
//   res.clearCookie('accountId');
//   res.status(200).json({ message: 'Logged out successfully' });
// };

module.exports = { createAccount, updateAccount, deactivateAccount };
