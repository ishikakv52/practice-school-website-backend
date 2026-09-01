const express = require("express");
const controller = require("../controllers/auth.controller");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const rateLimit = require("express-rate-limit");

const router = express.Router();

// Stricter limiter on login specifically, to slow down credential guessing.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: "Too many login attempts. Try again later." } },
});

router.post("/login", loginLimiter, asyncHandler(controller.login));
router.post("/logout", controller.logout);
router.get("/me", requireAuth, asyncHandler(controller.me));

module.exports = router;
