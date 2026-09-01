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
  const [result] = await pool.execute(
    `INSERT INTO admissions
      (student_name, date_of_birth, grade_applied, parent_name, phone, email, message)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [studentName, dateOfBirth, gradeApplied, parentName, phone, email, message || null]
  );
  return {
    id: result.insertId,
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
    sql += ` WHERE status = ?`;
    params.push(status);
  }
  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function getAdmissionById(id) {
  const [rows] = await pool.execute(`SELECT * FROM admissions WHERE id = ?`, [id]);
  return rows[0] || null;
}

async function updateAdmissionStatus(id, status) {
  await pool.execute(`UPDATE admissions SET status = ? WHERE id = ?`, [status, id]);
  return getAdmissionById(id);
}

module.exports = {
  createAdmission,
  listAdmissions,
  getAdmissionById,
  updateAdmissionStatus,
};
