const { pool } = require("../config/db");

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

module.exports = { findByEmail, findById, listParentStudentEmails, createUser };