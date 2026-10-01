const express = require("express");
const {
  createAccount,
  updateAccount,
  deactivateAccount,
  deleteAccount,
  getAccountsXp,
} = require("../controllers/accountController");
const router = express.Router();
router.post("/create", createAccount);
router.post("/update", updateAccount);
router.post("/deactivate", deactivateAccount); // 👈 new
router.post("/delete", deleteAccount); // delete journal + all its trades
router.get("/xp", getAccountsXp); // per-account XP for Settings

module.exports = router;
