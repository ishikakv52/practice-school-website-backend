const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
const env = require("../config/env");
const { ApiError } = require("../middleware/errorHandler");

const SALT_ROUNDS = 12;

async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

async function createAccountWithRole({ name, email, password, role }) {
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

async function signup({ name, email, password, role }) {
  if (!['parent', 'student'].includes(role)) {
    throw new ApiError(400, 'Signup is available for parents and students only');
  }

  return createAccountWithRole({ name, email, password, role });
}

const ADMIN_CREATABLE_ROLES = ['teacher', 'principal', 'staff'];

async function adminCreateAccount({ name, email, password, role }) {
  if (!ADMIN_CREATABLE_ROLES.includes(role)) {
    throw new ApiError(400, `Role must be one of: ${ADMIN_CREATABLE_ROLES.join(', ')}`);
  }

  return createAccountWithRole({ name, email, password, role });
}

async function adminListAccounts() {
  return userModel.listStaffAccounts();
}

async function adminUpdateAccount(id, { name, email, role }) {
  if (!ADMIN_CREATABLE_ROLES.includes(role)) {
    throw new ApiError(400, `Role must be one of: ${ADMIN_CREATABLE_ROLES.join(', ')}`);
  }

  const existing = await userModel.findStaffAccountById(id);
  if (!existing) {
    throw new ApiError(404, 'Account not found');
  }

  if (email !== existing.email) {
    const emailTaken = await userModel.findByEmail(email);
    if (emailTaken) {
      throw new ApiError(409, 'An account with this email already exists');
    }
  }

  try {
    return await userModel.updateStaffAccount(id, { name, email, role });
  } catch (err) {
    if (err.code === '23505') {
      throw new ApiError(409, 'An account with this email already exists');
    }
    throw err;
  }
}

async function adminSetAccountStatus(id, isActive) {
  const existing = await userModel.findStaffAccountById(id);
  if (!existing) {
    throw new ApiError(404, 'Account not found');
  }
  return userModel.setStaffAccountActive(id, isActive);
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

  if (user.is_active === false) {
    throw new ApiError(403, "This account has been deactivated. Contact the school administrator.");
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

module.exports = {
  hashPassword,
  login,
  signup,
  adminCreateAccount,
  adminListAccounts,
  adminUpdateAccount,
  adminSetAccountStatus,
};
