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
  findPendingAdmissions,
  findAdmissionById,
  approveAdmissionAndCreateStudent,
  rejectAdmission,
};
async function findPendingAdmissions() {
  const result = await pool.query(
    `SELECT * FROM admissions WHERE status = 'pending' ORDER BY created_at ASC`
  );
  return result.rows;
}

async function findAdmissionById(id) {
  const result = await pool.query(`SELECT * FROM admissions WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

async function approveAdmissionAndCreateStudent(admissionId, classId, principalUserId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const admissionResult = await client.query(
      `SELECT * FROM admissions WHERE id = $1 AND status = 'pending'`,
      [admissionId]
    );
    const admission = admissionResult.rows[0];
    if (!admission) throw new Error("Admission not found or already reviewed");

    const studentResult = await client.query(
      `INSERT INTO students (name, class_id) VALUES ($1, $2) RETURNING id`,
      [admission.student_name, classId]
    );
    const newStudentId = studentResult.rows[0].id;

    // System auto-generates the admission number — parent's form never collects one
    const admissionNumber = `ADM-${new Date().getFullYear()}-${String(newStudentId).padStart(4, "0")}`;
    await client.query(
      `UPDATE students SET admission_number = $1 WHERE id = $2`,
      [admissionNumber, newStudentId]
    );

    await client.query(
      `UPDATE admissions SET status = 'approved', assigned_class_id = $1, reviewed_by = $2,
       reviewed_at = NOW(), student_id = $3 WHERE id = $4`,
      [classId, principalUserId, newStudentId, admissionId]
    );

    await client.query("COMMIT");
    return { admissionId, studentId: newStudentId, admissionNumber };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function rejectAdmission(admissionId, principalUserId, reason) {
  const result = await pool.query(
    `UPDATE admissions SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), reject_reason = $2
     WHERE id = $3 AND status = 'pending' RETURNING *`,
    [principalUserId, reason || null, admissionId]
  );
  return result.rows[0] || null;
}
