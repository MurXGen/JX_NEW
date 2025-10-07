const express = require("express");
const router = express.Router();
const {
  upsertPlan,
  getPlans,
  deletePlan,
} = require("../controller/planController");

router.post("/upsert", upsertPlan);

// GET /api/plans
router.get("/", getPlans);

// DELETE /api/plans/:planId
router.delete("/:planId", deletePlan);

module.exports = router;
