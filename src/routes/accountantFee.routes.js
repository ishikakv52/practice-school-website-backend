const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/auth");
const accountantFeeController = require("../controllers/accountantFee.controller");

router.get("/accountant/students", requireAuth, requireRole("accountant"), accountantFeeController.getAccountantStudents);
router.post("/mark-paid", requireAuth, requireRole("accountant"), accountantFeeController.markFeePaid);

module.exports = router;
