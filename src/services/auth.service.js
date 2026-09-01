const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
const env = require("../config/env");
const { ApiError } = require("../middleware/errorHandler");

const SALT_ROUNDS = 12;

async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/**
 * Verifies email/password and returns a signed JWT + safe user object.
 * Throws a generic 401 on any failure so we never reveal whether the
 * email exists (standard practice against user enumeration).
 */
async function login(email, password) {
  const user = await userModel.findByEmail(email);
  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  const matches = await bcrypt.compare(password, user.password_hash);
  if (!matches) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (!env.jwt.secret) {
    throw new ApiError(500, "Server auth is not configured");
  }

  const token = jwt.sign(
    { sub: user.id, role: user.role },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

module.exports = { hashPassword, login };
