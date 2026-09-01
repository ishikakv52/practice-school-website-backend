// Central error handler. Controllers/services should throw ApiError (or
// call next(err)) instead of sending responses directly on failure —
// this is the only place that formats error JSON, so the shape stays
// consistent across every endpoint added in later phases.

class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

function notFoundHandler(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const isServerError = statusCode >= 500;

  if (isServerError) {
    // Full detail server-side only — never leak internals to the client.
    console.error("[error]", err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message: isServerError ? "Internal server error" : err.message,
      ...(err.details ? { details: err.details } : {}),
    },
  });
}

module.exports = { ApiError, notFoundHandler, errorHandler };
