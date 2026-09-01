const { pool } = require("../config/db");

async function createEnquiry({ name, email, subject, message }) {
  const { rows } = await pool.query(
    `INSERT INTO enquiries (name, email, subject, message)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [name, email, subject, message]
  );
  return { id: rows[0].id, name, email, subject, message, status: "new" };
}

async function listEnquiries({ status, limit = 50, offset = 0 }) {
  const params = [];
  let sql = `SELECT * FROM enquiries`;
  if (status) {
    params.push(status);
    sql += ` WHERE status = $${params.length}`;
  }
  params.push(limit, offset);
  sql += ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

  const { rows } = await pool.query(sql, params);
  return rows;
}

async function getEnquiryById(id) {
  const { rows } = await pool.query(`SELECT * FROM enquiries WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function updateEnquiryStatus(id, status) {
  await pool.query(`UPDATE enquiries SET status = $1 WHERE id = $2`, [status, id]);
  return getEnquiryById(id);
}

module.exports = { createEnquiry, listEnquiries, getEnquiryById, updateEnquiryStatus };