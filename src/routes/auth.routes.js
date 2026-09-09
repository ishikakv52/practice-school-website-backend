const express = require("express");
const controller = require("../controllers/auth.controller");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth");
const rateLimit = require("express-rate-limit");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: "Too many login attempts. Try again later." } },
});

const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: "Too many signup attempts. Try again later." } },
});

router.post("/signup", signupLimiter, asyncHandler(controller.signup));
router.post("/login", loginLimiter, asyncHandler(controller.login));
router.post("/logout", controller.logout);
router.get("/me", requireAuth, asyncHandler(controller.me));

router.post(
  "/admin/create-account",
  requireAuth,
  requireRole("admin"),
  asyncHandler(controller.createAccount)
);

module.exports = router;
