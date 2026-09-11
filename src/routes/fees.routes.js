const express = require("express");
const router = express.Router();
const feeController = require("../controllers/fee.controller");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth");

router.post("/create-order", requireAuth, feeController.createOrder);
router.post("/verify", requireAuth, feeController.verifyPayment);
router.post("/payment-failed", requireAuth, feeController.paymentFailed);
router.get("/student/:studentId", requireAuth, feeController.listFees);

router.get("/captcha", requireAuth, requireRole("parent"), asyncHandler(feeController.getCaptcha));
router.post("/verify-student", requireAuth, requireRole("parent"), asyncHandler(feeController.verifyStudent));

module.exports = router;
