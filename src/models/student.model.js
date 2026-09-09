const { pool } = require("../config/db");

async function createStudent({ name, classId, rollNumber }) {
  const { rows } = await pool.query(
    `INSERT INTO students (name, class_id, roll_number)
     VALUES ($1, $2, $3)
     RETURNING id, name, class_id, roll_number, created_at`,
    [name, classId, rollNumber || null]
  );
  return rows[0];
}

async function listStudentsByClass(classId) {
  const { rows } = await pool.query(
    `SELECT id, name, class_id, roll_number, created_at
     FROM students
     WHERE class_id = $1
     ORDER BY roll_number NULLS LAST, name`,
    [classId]
  );
  return rows;
}

async function findStudentById(id) {
  const { rows } = await pool.query(`SELECT * FROM students WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function countStudentsMatchingClass(studentIds, classId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM students WHERE id = ANY($1) AND class_id = $2`,
    [studentIds, classId]
  );
  return rows[0].count;
}

module.exports = {
  createStudent,
  listStudentsByClass,
  findStudentById,
  countStudentsMatchingClass,
};
