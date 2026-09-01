// Wraps an async route handler so rejected promises are forwarded to
// Express's error handler instead of crashing the process. Later
// controllers should use this instead of repeating try/catch everywhere:
//
//   router.get("/", asyncHandler(async (req, res) => { ... }));

function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
