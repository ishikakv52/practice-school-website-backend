const { pool } = require("../config/db");

// Accountant: class-wise + month-wise students with fee status
const getAccountantStudents = async (req, res, next) => {
  try {
    const { class_id, fee_month } = req.query;
    if (!fee_month) {
      return res.status(400).json({ error: "fee_month is required (e.g. 2026-09)" });
    }

    const params = [fee_month];
    let filter = "";
    if (class_id) {
      params.push(class_id);
      filter = `AND s.class_id = $${params.length}`;
    }

    const query = `
      SELECT s.id AS student_id, s.name AS student_name, s.class_id,
             f.id AS fee_id, f.amount AS fee_amount,
             f.status, f.payment_mode, f.paid_at, f.fee_month
      FROM students s
      LEFT JOIN fees f ON f.student_id = s.id AND f.fee_month = $1
      WHERE 1=1 ${filter}
      ORDER BY s.name
    `;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

// Accountant: mark a student's fee as paid for a specific month (offline/cash)
const markFeePaid = async (req, res, next) => {
  try {
    const { student_id, fee_month, amount, payment_mode } = req.body;
    if (!student_id || !fee_month || !amount || !payment_mode) {
      return res.status(400).json({ error: "student_id, fee_month, amount, payment_mode required" });
    }

    const result = await pool.query(
      `INSERT INTO fees (student_id, fee_month, amount, status, payment_mode, marked_by, paid_at)
       VALUES ($1, $2, $3, 'paid', $4, $5, NOW())
       ON CONFLICT (student_id, fee_month)
       DO UPDATE SET amount = $3, status = 'paid', payment_mode = $4,
                      marked_by = $5, paid_at = NOW(), updated_at = NOW()
       RETURNING *`,
      [student_id, fee_month, amount, payment_mode, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

module.exports = { getAccountantStudents, markFeePaid };
