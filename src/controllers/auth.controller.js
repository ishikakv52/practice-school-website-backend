const authService = require("../services/auth.service");
const userModel = require("../models/user.model");
const env = require("../config/env");
const { ApiError } = require("../middleware/errorHandler");

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.nodeEnv === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days, keep in sync with jwt.expiresIn default
};

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const { token, user } = await authService.login(email, password);

  res.cookie(env.jwt.cookieName, token, COOKIE_OPTIONS);
  res.json({ success: true, data: { user } });
}

function logout(req, res) {
  res.clearCookie(env.jwt.cookieName, { ...COOKIE_OPTIONS, maxAge: undefined });
  res.json({ success: true, data: null });
}

async function me(req, res) {
  const user = await userModel.findById(req.user.id);
  if (!user) {
    throw new ApiError(401, "Not authenticated");
  }
  res.json({ success: true, data: { user } });
}

module.exports = { login, logout, me };
