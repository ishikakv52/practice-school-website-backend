const jwt = require("jsonwebtoken");
const env = require("../config/env");
const { ApiError } = require("./errorHandler");

/**
 * Verifies the JWT from the httpOnly cookie and attaches { id, role }
 * to req.user. Using a cookie (not a header) means the frontend never
 * touches the token directly — no localStorage, so it's not readable
 * by injected/third-party JS.
 */
function requireAuth(req, res, next) {
  const token = req.cookies?.[env.jwt.cookieName];
  if (!token) {
    return next(new ApiError(401, "Not authenticated"));
  }

  if (!env.jwt.secret) {
    return next(new ApiError(500, "Server auth is not configured"));
  }

  try {
    const payload = jwt.verify(token, env.jwt.secret);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(new ApiError(401, "Session expired or invalid — please log in again"));
  }
}

/**
 * Use after requireAuth: router.get("/", requireAuth, requireRole("admin"), ...)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, "You don't have permission to do that"));
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
