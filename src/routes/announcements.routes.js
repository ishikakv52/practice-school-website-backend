const express = require("express");
const controller = require("../controllers/announcement.controller");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// Admin-only — send + view announcement history
router.post("/send", requireAuth, requireRole("admin"), asyncHandler(controller.send));
router.get("/", requireAuth, requireRole("admin"), asyncHandler(controller.list));

module.exports = router;