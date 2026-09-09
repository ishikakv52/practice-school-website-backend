const express = require("express");
const controller = require("../controllers/class.controller");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get(
  "/",
  requireAuth,
  requireRole("admin", "principal"),
  asyncHandler(controller.listClasses)
);
router.get("/mine", requireAuth, requireRole("teacher"), asyncHandler(controller.listMyClasses));
router.post("/", requireAuth, requireRole("admin"), asyncHandler(controller.createClass));
router.post(
  "/:id/teachers",
  requireAuth,
  requireRole("admin"),
  asyncHandler(controller.assignTeacher)
);
router.delete(
  "/:id/teachers/:teacherId",
  requireAuth,
  requireRole("admin"),
  asyncHandler(controller.unassignTeacher)
);

module.exports = router;
