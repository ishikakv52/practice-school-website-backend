// Basic rate limiting for public, unauthenticated form endpoints
// (contact/admissions) so they can't be spammed or scripted easily.
// Swap the store for a Redis-backed one later if you run multiple
// backend instances — this in-memory limiter is per-process only.

const rateLimit = require("express-rate-limit");

const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 submissions per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: "Too many submissions. Please try again later." },
  },
});

module.exports = { formLimiter };
