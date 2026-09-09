const { pool } = require("../config/db");

async function upsertAttendanceRecords(records) {
  // records: [{ studentId, classId, date, status, markedBy }]
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const results = [];
    for (const r of records) {
      const { rows } = await client.query(
        `INSERT INTO attendance (student_id, class_id, date, status, marked_by)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (student_id, date)
         DO UPDATE SET status = EXCLUDED.status,
                       marked_by = EXCLUDED.marked_by,
                       updated_at = CURRENT_TIMESTAMP
         RETURNING id, student_id, class_id, date, status, marked_by`,
        [r.studentId, r.classId, r.date, r.status, r.markedBy]
      );
      results.push(rows[0]);
    }
    await client.query("COMMIT");
    return results;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function getAttendanceByClassAndDate(classId, date) {
  const { rows } = await pool.query(
    `SELECT student_id, status, marked_by, updated_at
     FROM attendance
     WHERE class_id = $1 AND date = $2`,
    [classId, date]
  );
  return rows;
}

module.exports = { upsertAttendanceRecords, getAttendanceByClassAndDate };
