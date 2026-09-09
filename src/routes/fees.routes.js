const express = require("express");
const router = express.Router();
const feeController = require("../controllers/fee.controller");
const { requireAuth } = require("../middleware/auth");

router.post("/create-order", requireAuth, feeController.createOrder);
router.post("/verify", requireAuth, feeController.verifyPayment);
router.get("/student/:studentId", requireAuth, feeController.listFees);

module.exports = router;
