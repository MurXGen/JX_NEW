const express = require("express");
const {
  createAccount,
  updateAccount,
  deactivateAccount,
  getAccountsXp,
} = require("../controllers/accountController");
const router = express.Router();
router.post("/create", createAccount);
router.post("/update", updateAccount);
router.post("/deactivate", deactivateAccount); // 👈 new
router.get("/xp", getAccountsXp); // per-account XP for Settings

module.exports = router;
