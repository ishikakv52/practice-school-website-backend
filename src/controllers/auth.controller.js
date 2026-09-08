const authService = require("../services/auth.service");
const userModel = require("../models/user.model");
const env = require("../config/env");
const { ApiError } = require("../middleware/errorHandler");

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.nodeEnv === "production",
  sameSite: env.nodeEnv === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

async function login(req, res) {
  const email = req.body.email?.trim().toLowerCase();
  const { password } = req.body;
  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const { token, user } = await authService.login(email, password);

  res.cookie(env.jwt.cookieName, token, COOKIE_OPTIONS);
  res.json({ success: true, data: { user } });
}

async function signup(req, res) {
  const name = req.body.name?.trim();
  const email = req.body.email?.trim().toLowerCase();
  const { password, role } = req.body;

  if (!name || !email || !password || !role) {
    throw new ApiError(400, "Name, email, password, and role are required");
  }
  if (name.length > 150 || email.length > 255) {
    throw new ApiError(400, "Name or email is too long");
  }
  if (password.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters");
  }

  const user = await authService.signup({ name, email, password, role });
  const { token } = await authService.login(email, password);
  res.cookie(env.jwt.cookieName, token, COOKIE_OPTIONS);
  res.status(201).json({ success: true, data: { user } });
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

module.exports = { login, logout, me, signup };
