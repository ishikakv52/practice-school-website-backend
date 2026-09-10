const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/auth");
const controller = require("../controllers/staffAttendance.controller");

router.post("/mark-morning", requireAuth, requireRole("teacher", "staff", "accountant"), controller.markMorning);
router.post("/mark-afternoon", requireAuth, requireRole("teacher", "staff", "accountant"), controller.markAfternoon);
router.get("/me", requireAuth, requireRole("teacher", "staff", "accountant"), controller.getMyStatus);
router.get("/all", requireAuth, requireRole("principal", "admin"), controller.getAllForDate);

module.exports = router;
