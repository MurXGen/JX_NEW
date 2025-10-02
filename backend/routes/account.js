const express = require("express");
const {
  createAccount,
  updateAccount,
  deactivateAccount,
} = require("../controllers/accountController");
const router = express.Router();
router.post("/create", createAccount);
router.post("/update", updateAccount);
router.post("/deactivate", deactivateAccount); // 👈 new

module.exports = router;
