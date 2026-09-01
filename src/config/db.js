// MySQL connection pool. Everything queries through this pool using
// parameterized queries (`pool.execute(sql, params)`) — never build SQL
// by string-concatenating user input.

const mysql = require("mysql2/promise");
const env = require("./env");

const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.name,
  user: env.db.user,
  password: env.db.password,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
});

/**
 * Quick connectivity check used at startup and by the /api/health route.
 * Never throws — returns a boolean so callers can decide how to react.
 */
async function checkConnection() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    return true;
  } catch (err) {
    console.error("[db] Connection check failed:", err.message);
    return false;
  }
}

module.exports = { pool, checkConnection };
