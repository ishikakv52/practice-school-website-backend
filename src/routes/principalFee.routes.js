const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/auth");
const principalFeeController = require("../controllers/principalFee.controller");

router.post("/class-fee", requireAuth, requireRole("principal"), principalFeeController.setClassFee);
router.get("/class-fee", requireAuth, requireRole("principal"), principalFeeController.getClassFees);

module.exports = router;
