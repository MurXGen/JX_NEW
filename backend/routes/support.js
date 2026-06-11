const express = require("express");
const router = express.Router();
const { getSupportTickets } = require("../controllers/supportController");

// the user's own open (unresolved) support tickets, read from the Google Sheet
router.get("/tickets", getSupportTickets);

module.exports = router;
