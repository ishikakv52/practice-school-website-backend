const { pool } = require("../config/db");

const STAFF_ROLES = ["teacher", "principal", "staff"];

async function findByEmail(email) {
  const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT id, name, email, role, created_at FROM users WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function listParentStudentEmails() {
  const { rows } = await pool.query(
    `SELECT email FROM users
     WHERE role IN ('parent', 'student') AND email IS NOT NULL`
  );
  return rows.map((row) => row.email);
}

async function createUser({ name, email, passwordHash, role = "admin" }) {
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [name, email, passwordHash, role]
  );
  return { id: rows[0].id, name, email, role };
}

// --- Admin: manage Teacher / Principal / Staff accounts ---

async function listStaffAccounts() {
  const { rows } = await pool.query(
    `SELECT id, name, email, role, is_active, created_at
     FROM users
     WHERE role = ANY($1)
     ORDER BY created_at DESC`,
    [STAFF_ROLES]
  );
  return rows;
}

async function findStaffAccountById(id) {
  const { rows } = await pool.query(
    `SELECT id, name, email, role, is_active, created_at
     FROM users
     WHERE id = $1 AND role = ANY($2)`,
    [id, STAFF_ROLES]
  );
  return rows[0] || null;
}

async function updateStaffAccount(id, { name, email, role }) {
  const { rows } = await pool.query(
    `UPDATE users
     SET name = $1, email = $2, role = $3
     WHERE id = $4 AND role = ANY($5)
     RETURNING id, name, email, role, is_active, created_at`,
    [name, email, role, id, STAFF_ROLES]
  );
  return rows[0] || null;
}

async function setStaffAccountActive(id, isActive) {
  const { rows } = await pool.query(
    `UPDATE users
     SET is_active = $1
     WHERE id = $2 AND role = ANY($3)
     RETURNING id, name, email, role, is_active, created_at`,
    [isActive, id, STAFF_ROLES]
  );
  return rows[0] || null;
}

module.exports = {
  findByEmail,
  findById,
  listParentStudentEmails,
  createUser,
  listStaffAccounts,
  findStaffAccountById,
  updateStaffAccount,
  setStaffAccountActive,
};
