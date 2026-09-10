const express = require("express");
const controller = require("../controllers/admission.controller");
const asyncHandler = require("../utils/asyncHandler");
const { formLimiter } = require("../middleware/rateLimiter");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// POST /api/admissions — public admission application submission
router.post("/", formLimiter, asyncHandler(controller.submit));

// Principal-only — review pending admissions, approve with class allocation, or reject
// NOTE: /pending must stay ABOVE the /:id route below, else Express matches "pending" as an :id
router.get("/pending", requireAuth, requireRole("principal"), asyncHandler(controller.getPendingAdmissions));
router.post("/:id/approve", requireAuth, requireRole("principal"), asyncHandler(controller.approveAdmission));
router.post("/:id/reject", requireAuth, requireRole("principal"), asyncHandler(controller.rejectAdmission));

// Admin-only — list/view/update submitted applications
router.get("/", requireAuth, requireRole("admin"), asyncHandler(controller.list));
router.get("/:id", requireAuth, requireRole("admin"), asyncHandler(controller.getById));
router.patch(
  "/:id/status",
  requireAuth,
  requireRole("admin"),
  asyncHandler(controller.updateStatus)
);

module.exports = router;
