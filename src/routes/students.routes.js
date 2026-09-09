const express = require("express");
const controller = require("../controllers/student.controller");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.post("/", requireAuth, requireRole("admin"), asyncHandler(controller.createStudent));
router.get(
  "/",
  requireAuth,
  requireRole("admin", "principal", "teacher"),
  asyncHandler(controller.listStudents)
);

module.exports = router;
