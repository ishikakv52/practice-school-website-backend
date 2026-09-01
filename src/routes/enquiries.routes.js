const express = require("express");
const controller = require("../controllers/enquiry.controller");
const asyncHandler = require("../utils/asyncHandler");
const { formLimiter } = require("../middleware/rateLimiter");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// POST /api/enquiries — public contact form submission
router.post("/", formLimiter, asyncHandler(controller.submit));

// Admin-only — list/view/update submitted enquiries
router.get("/", requireAuth, requireRole("admin"), asyncHandler(controller.list));
router.get("/:id", requireAuth, requireRole("admin"), asyncHandler(controller.getById));
router.patch(
  "/:id/status",
  requireAuth,
  requireRole("admin"),
  asyncHandler(controller.updateStatus)
);

module.exports = router;
