const { pool } = require("../config/db");

async function createClass({ name, section }) {
  const { rows } = await pool.query(
    `INSERT INTO classes (name, section) VALUES ($1, $2) RETURNING id, name, section, created_at`,
    [name, section]
  );
  return rows[0];
}

async function listClasses() {
  const { rows } = await pool.query(
    `SELECT c.id, c.name, c.section, c.created_at,
            COALESCE(
              json_agg(
                json_build_object('id', u.id, 'name', u.name, 'email', u.email)
              ) FILTER (WHERE u.id IS NOT NULL), '[]'
            ) AS teachers
     FROM classes c
     LEFT JOIN teacher_classes tc ON tc.class_id = c.id
     LEFT JOIN users u ON u.id = tc.teacher_id
     GROUP BY c.id
     ORDER BY c.name, c.section`
  );
  return rows;
}

async function findClassById(id) {
  const { rows } = await pool.query(`SELECT * FROM classes WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function assignTeacher(teacherId, classId) {
  const { rows } = await pool.query(
    `INSERT INTO teacher_classes (teacher_id, class_id)
     VALUES ($1, $2)
     ON CONFLICT (teacher_id, class_id) DO NOTHING
     RETURNING id`,
    [teacherId, classId]
  );
  return rows[0] || null;
}

async function unassignTeacher(teacherId, classId) {
  await pool.query(`DELETE FROM teacher_classes WHERE teacher_id = $1 AND class_id = $2`, [
    teacherId,
    classId,
  ]);
}

async function listClassesForTeacher(teacherId) {
  const { rows } = await pool.query(
    `SELECT c.id, c.name, c.section
     FROM classes c
     JOIN teacher_classes tc ON tc.class_id = c.id
     WHERE tc.teacher_id = $1
     ORDER BY c.name, c.section`,
    [teacherId]
  );
  return rows;
}

async function isTeacherAssignedToClass(teacherId, classId) {
  const { rows } = await pool.query(
    `SELECT 1 FROM teacher_classes WHERE teacher_id = $1 AND class_id = $2`,
    [teacherId, classId]
  );
  return rows.length > 0;
}

// Us class ke saare assigned teachers (naye student ki notification bhejne ke liye)
async function listTeachersForClass(classId) {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email
     FROM teacher_classes tc
     JOIN users u ON u.id = tc.teacher_id
     WHERE tc.class_id = $1 AND u.email IS NOT NULL`,
    [classId]
  );
  return rows;
}

module.exports = {
  createClass,
  listClasses,
  findClassById,
  assignTeacher,
  unassignTeacher,
  listClassesForTeacher,
  isTeacherAssignedToClass,
  listTeachersForClass,
};
