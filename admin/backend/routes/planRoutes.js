const express = require("express");
const router = express.Router();
const planController = require("../controller/planController");

// Correct usage — no parentheses
router.post("/upsert", planController.upsertPlans);
router.get("/", planController.getPlans);
router.delete("/:code", planController.deletePlan);

module.exports = router;
