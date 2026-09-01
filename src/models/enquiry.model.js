const { pool } = require("../config/db");

async function createEnquiry({ name, email, subject, message }) {
  const [result] = await pool.execute(
    `INSERT INTO enquiries (name, email, subject, message) VALUES (?, ?, ?, ?)`,
    [name, email, subject, message]
  );
  return { id: result.insertId, name, email, subject, message, status: "new" };
}

async function listEnquiries({ status, limit = 50, offset = 0 }) {
  const params = [];
  let sql = `SELECT * FROM enquiries`;
  if (status) {
    sql += ` WHERE status = ?`;
    params.push(status);
  }
  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function getEnquiryById(id) {
  const [rows] = await pool.execute(`SELECT * FROM enquiries WHERE id = ?`, [id]);
  return rows[0] || null;
}

async function updateEnquiryStatus(id, status) {
  await pool.execute(`UPDATE enquiries SET status = ? WHERE id = ?`, [status, id]);
  return getEnquiryById(id);
}

module.exports = { createEnquiry, listEnquiries, getEnquiryById, updateEnquiryStatus };
