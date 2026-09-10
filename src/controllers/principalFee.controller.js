const { pool } = require("../config/db");

function getMonthsForAcademicYear(academic_year) {
  // academic_year like "2026-2027" -> April 2026 to March 2027
  const [startYear, endYear] = academic_year.split("-").map(Number);
  const months = [];
  for (let m = 4; m <= 12; m++) {
    months.push(`${startYear}-${String(m).padStart(2, "0")}`);
  }
  for (let m = 1; m <= 3; m++) {
    months.push(`${endYear}-${String(m).padStart(2, "0")}`);
  }
  return months;
}

// Principal: set or update a class's monthly fee amount,
// and generate/update all 12 monthly fee records for every student in that class
const setClassFee = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { class_id, academic_year, amount } = req.body;
    if (!class_id || !academic_year || amount === undefined) {
      return res.status(400).json({ error: "class_id, academic_year, amount required" });
    }

    await client.query("BEGIN");

    const classFeeResult = await client.query(
      `INSERT INTO class_fees (class_id, academic_year, amount, created_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (class_id, academic_year)
       DO UPDATE SET amount = $3, updated_at = NOW()
       RETURNING *`,
      [class_id, academic_year, amount, req.user.id]
    );

    const studentsResult = await client.query(
      `SELECT id FROM students WHERE class_id = $1`,
      [class_id]
    );

    const months = getMonthsForAcademicYear(academic_year);

    for (const student of studentsResult.rows) {
      for (const fee_month of months) {
        await client.query(
          `INSERT INTO fees (student_id, amount, fee_month, status)
           VALUES ($1, $2, $3, 'unpaid')
           ON CONFLICT (student_id, fee_month)
           DO UPDATE SET amount = $2
           WHERE fees.status IS DISTINCT FROM 'paid'`,
          [student.id, amount, fee_month]
        );
      }
    }

    await client.query("COMMIT");
    res.json(classFeeResult.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
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
