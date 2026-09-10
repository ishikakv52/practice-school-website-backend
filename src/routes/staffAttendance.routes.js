const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/auth");
const controller = require("../controllers/staffAttendance.controller");

router.post("/check-in", requireAuth, requireRole("teacher", "staff", "accountant"), controller.checkIn);
router.post("/check-out", requireAuth, requireRole("teacher", "staff", "accountant"), controller.checkOut);
router.get("/me", requireAuth, requireRole("teacher", "staff", "accountant"), controller.getMyStatus);
router.get("/all", requireAuth, requireRole("principal", "admin"), controller.getAllForDate);

module.exports = router;
