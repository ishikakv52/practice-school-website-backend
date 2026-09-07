const pool = require("../db");

async function createAnnouncement({ title, message }) {
  const { rows } = await pool.query(
    `INSERT INTO announcements (title, message) VALUES ($1, $2) RETURNING *`,
    [title, message]
  );
  return rows[0];
}

async function listAnnouncements({ limit = 50, offset = 0 } = {}) {
  const { rows } = await pool.query(
    `SELECT * FROM announcements ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

module.exports = { createAnnouncement, listAnnouncements };