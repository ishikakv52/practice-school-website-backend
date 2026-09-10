const { pool } = require("../config/db");

// Principal: set or update a class's annual fee amount
const setClassFee = async (req, res, next) => {
  try {
    const { class_id, academic_year, amount } = req.body;
    if (!class_id || !academic_year || amount === undefined) {
      return res.status(400).json({ error: "class_id, academic_year, amount required" });
    }

    const result = await pool.query(
      `INSERT INTO class_fees (class_id, academic_year, amount, created_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (class_id, academic_year)
       DO UPDATE SET amount = $3, updated_at = NOW()
       RETURNING *`,
      [class_id, academic_year, amount, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// Principal: list all class fees set so far (optionally filter by year)
const getClassFees = async (req, res, next) => {
  try {
    const { academic_year } = req.query;
    const params = [];
    let filter = "";
    if (academic_year) {
      params.push(academic_year);
      filter = `WHERE cf.academic_year = $1`;
    }

    const result = await pool.query(
      `SELECT cf.id, cf.class_id, c.name AS class_name, cf.academic_year, cf.amount
       FROM class_fees cf
       JOIN classes c ON c.id = cf.class_id
       ${filter}
       ORDER BY c.name`,
      params
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

module.exports = { setClassFee, getClassFees };
