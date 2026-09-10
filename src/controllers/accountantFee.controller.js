const { pool } = require("../config/db");

const getAccountantStudents = async (req, res, next) => {
  try {
    const { class_id, academic_year } = req.query;
    const params = [];
    let filter = "";
    if (class_id) {
      params.push(class_id);
      filter = `WHERE s.class_id = $${params.length}`;
    }

    const query = `
      SELECT s.id AS student_id, s.name AS student_name, s.class_id,
             cf.amount AS fee_amount,
             f.id AS fee_id, f.status, f.payment_mode, f.paid_at
      FROM students s
      LEFT JOIN class_fees cf ON cf.class_id = s.class_id
        ${academic_year ? `AND cf.academic_year = '${academic_year}'` : ""}
      LEFT JOIN fees f ON f.student_id = s.id
      ${filter}
      ORDER BY s.name
    `;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

const markFeePaid = async (req, res, next) => {
  try {
    const { student_id, amount, payment_mode } = req.body;
    if (!student_id || !amount || !payment_mode) {
      return res.status(400).json({ error: "student_id, amount, payment_mode required" });
    }

    const existing = await pool.query(`SELECT id FROM fees WHERE student_id = $1`, [student_id]);

    let result;
    if (existing.rows.length > 0) {
      result = await pool.query(
        `UPDATE fees
         SET amount = $1, status = 'paid', payment_mode = $2,
             marked_by = $3, paid_at = NOW(), updated_at = NOW()
         WHERE student_id = $4
         RETURNING *`,
        [amount, payment_mode, req.user.id, student_id]
      );
    } else {
      result = await pool.query(
        `INSERT INTO fees (student_id, amount, status, payment_mode, marked_by, paid_at)
         VALUES ($1, $2, 'paid', $3, $4, NOW())
         RETURNING *`,
        [student_id, amount, payment_mode, req.user.id]
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

module.exports = { getAccountantStudents, markFeePaid };
