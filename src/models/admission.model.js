const { pool } = require("../config/db");

async function createAdmission({
  studentName,
  dateOfBirth,
  gradeApplied,
  parentName,
  phone,
  email,
  message,
}) {
  const { rows } = await pool.query(
    `INSERT INTO admissions
      (student_name, date_of_birth, grade_applied, parent_name, phone, email, message)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [studentName, dateOfBirth, gradeApplied, parentName, phone, email, message || null]
  );
  return {
    id: rows[0].id,
    studentName,
    dateOfBirth,
    gradeApplied,
    parentName,
    phone,
    email,
    message: message || null,
    status: "pending",
  };
}

async function listAdmissions({ status, limit = 50, offset = 0 }) {
  const params = [];
  let sql = `SELECT * FROM admissions`;
  if (status) {
    params.push(status);
    sql += ` WHERE status = $${params.length}`;
  }
  params.push(limit, offset);
  sql += ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

  const { rows } = await pool.query(sql, params);
  return rows;
}

async function getAdmissionById(id) {
  const { rows } = await pool.query(`SELECT * FROM admissions WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function updateAdmissionStatus(id, status) {
  await pool.query(`UPDATE admissions SET status = $1 WHERE id = $2`, [status, id]);
  return getAdmissionById(id);
}

module.exports = {
  createAdmission,
  listAdmissions,
  getAdmissionById,
  updateAdmissionStatus,
};