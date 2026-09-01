// PostgreSQL connection pool. Everything queries through this pool using
// parameterized queries (`pool.query(sql, params)`) — never build SQL
// by string-concatenating user input.

const { Pool } = require("pg");
const env = require("./env");

const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.name,
  user: env.db.user,
  password: env.db.password,
  max: 10,
  idleTimeoutMillis: 30000,
  // Aiven's free-tier certificate isn't in Node's default CA bundle, so
  // rejectUnauthorized is left false. Swap this for a proper CA cert
  // (Aiven gives you one to download) if you want full certificate
  // verification instead.
  ssl: env.db.ssl ? { rejectUnauthorized: false } : false,
});

pool.on("error", (err) => {
  // Fired for idle clients that error in the background — log, don't crash.
  console.error("[db] Unexpected error on idle client:", err.message);
});

/**
 * Quick connectivity check used at startup and by the /api/health route.
 * Never throws — returns a boolean so callers can decide how to react.
 */
async function checkConnection() {
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    return true;
  } catch (err) {
    console.error("[db] Connection check failed:", err.message);
    return false;
  }
}

module.exports = { pool, checkConnection };