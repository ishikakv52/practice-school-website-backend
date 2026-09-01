const express = require("express");
const { checkConnection } = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

// GET /api/health — used to confirm the backend is running and can
// reach the database. Handy for local setup and for a future uptime check.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const dbConnected = await checkConnection();

    res.status(dbConnected ? 200 : 503).json({
      success: dbConnected,
      status: dbConnected ? "ok" : "degraded",
      db: dbConnected ? "connected" : "unreachable",
      timestamp: new Date().toISOString(),
    });
  })
);

module.exports = router;