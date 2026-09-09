const express = require("express");
const controller = require("../controllers/attendance.controller");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.post("/", requireAuth, requireRole("teacher"), asyncHandler(controller.markAttendance));
router.get(
  "/",
  requireAuth,
  requireRole("admin", "principal", "teacher"),
  asyncHandler(controller.getAttendance)
);

module.exports = router;
