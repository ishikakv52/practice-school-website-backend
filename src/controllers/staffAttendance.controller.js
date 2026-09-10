const { pool } = require("../config/db");

function today() {
  return new Date().toISOString().slice(0, 10);
}

function computeStatus(checkIn, checkOut) {
  if (checkIn && checkOut) return "full_day";
  if (checkIn || checkOut) return "half_day";
  return "absent";
}

// Mark morning (before-lunch) session
const markMorning = async (req, res, next) => {
  try {
    const result = await pool.query(
      `INSERT INTO staff_attendance (user_id, date, check_in_time, status)
       VALUES ($1, $2, NOW(), 'half_day')
       ON CONFLICT (user_id, date)
       DO UPDATE SET check_in_time = COALESCE(staff_attendance.check_in_time, NOW()),
                      status = CASE
                        WHEN staff_attendance.check_out_time IS NOT NULL THEN 'full_day'
                        ELSE 'half_day'
                      END,
                      updated_at = NOW()
       RETURNING *`,
      [req.user.id, today()]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// Mark afternoon (after-lunch) session
const markAfternoon = async (req, res, next) => {
  try {
    const result = await pool.query(
      `INSERT INTO staff_attendance (user_id, date, check_out_time, status)
       VALUES ($1, $2, NOW(), 'half_day')
       ON CONFLICT (user_id, date)
       DO UPDATE SET check_out_time = COALESCE(staff_attendance.check_out_time, NOW()),
                      status = CASE
                        WHEN staff_attendance.check_in_time IS NOT NULL THEN 'full_day'
                        ELSE 'half_day'
                      END,
                      updated_at = NOW()
       RETURNING *`,
      [req.user.id, today()]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// Logged-in teacher/staff's today status
const getMyStatus = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT * FROM staff_attendance WHERE user_id = $1 AND date = $2`,
      [req.user.id, today()]
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    next(err);
  }
};

// Principal/Admin: view all teacher/staff attendance for a date
const getAllForDate = async (req, res, next) => {
  try {
    const { date, role } = req.query;
    const targetDate = date || today();

    const result = await pool.query(
      `SELECT u.id AS user_id, u.name, u.role,
              sa.check_in_time, sa.check_out_time, sa.status
       FROM users u
       LEFT JOIN staff_attendance sa ON sa.user_id = u.id AND sa.date = $1
       WHERE u.role IN ('teacher', 'staff') ${role ? "AND u.role = $2" : ""}
       ORDER BY u.role, u.name`,
      role ? [targetDate, role] : [targetDate]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

module.exports = { markMorning, markAfternoon, getMyStatus, getAllForDate };
