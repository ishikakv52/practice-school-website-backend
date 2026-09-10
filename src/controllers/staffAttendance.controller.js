const { pool } = require("../config/db");

function today() {
  return new Date().toISOString().slice(0, 10);
}

// Logged-in teacher/staff checks in for today
const checkIn = async (req, res, next) => {
  try {
    const result = await pool.query(
      `INSERT INTO staff_attendance (user_id, date, check_in_time, status)
       VALUES ($1, $2, NOW(), 'present')
       ON CONFLICT (user_id, date)
       DO UPDATE SET check_in_time = COALESCE(staff_attendance.check_in_time, NOW())
       RETURNING *`,
      [req.user.id, today()]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// Logged-in teacher/staff checks out for today
const checkOut = async (req, res, next) => {
  try {
    const existing = await pool.query(
      `SELECT id, check_in_time FROM staff_attendance WHERE user_id = $1 AND date = $2`,
      [req.user.id, today()]
    );
    if (existing.rows.length === 0 || !existing.rows[0].check_in_time) {
      return res.status(400).json({ error: "You need to check in before checking out" });
    }

    const result = await pool.query(
      `UPDATE staff_attendance SET check_out_time = NOW(), updated_at = NOW()
       WHERE user_id = $1 AND date = $2 RETURNING *`,
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
    const params = [targetDate];
    let roleFilter = "";
    if (role) {
      params.push(role);
      roleFilter = `AND u.role = $${params.length}`;
    } else {
      params.push("teacher", "staff");
      roleFilter = `AND u.role = ANY($${params.length - 1}::text[])`;
      params.splice(params.length - 1, 1, ["teacher", "staff"]);
    }

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

module.exports = { checkIn, checkOut, getMyStatus, getAllForDate };
