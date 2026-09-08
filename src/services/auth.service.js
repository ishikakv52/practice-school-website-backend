const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
const env = require("../config/env");
const { ApiError } = require("../middleware/errorHandler");

const SALT_ROUNDS = 12;

async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

async function signup({ name, email, password, role }) {
  if (!['parent', 'student'].includes(role)) {
    throw new ApiError(400, 'Signup is available for parents and students only');
  }

  const existingUser = await userModel.findByEmail(email);
  if (existingUser) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  try {
    return await userModel.createUser({
      name,
      email,
      passwordHash: await hashPassword(password),
      role,
    });
  } catch (err) {
    if (err.code === '23505') {
      throw new ApiError(409, 'An account with this email already exists');
    }
    throw err;
  }
}

/**
 * Verifies email/password and returns a signed JWT + safe user object.
 * Throws a generic 401 on any failure so we never reveal whether the
 * email exists (standard practice against user enumeration).
 */
async function login(email, password) {
  const user = await userModel.findByEmail(email.toLowerCase());
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

module.exports = { hashPassword, login, signup };
