// One-time helper to apply schema.sql against the configured Postgres
// database, since `psql` isn't installed locally. Run from the backend/
// folder (same place you run `node server.js` from):
//
//   node run-schema.js
//
// Reads DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD / DB_SSL from
// your .env file, same as the app itself.

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432", 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl:
    process.env.DB_SSL != null
      ? process.env.DB_SSL === "true"
      : process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

// If DB_SSL=true, make sure ssl is the object form, not boolean true.
if (process.env.DB_SSL === "true") {
  pool.options.ssl = { rejectUnauthorized: false };
}

async function main() {
  const schemaPath = path.join(__dirname, "src", "config", "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");

  console.log(`Applying schema from ${schemaPath} ...`);
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log("Schema applied successfully.");
  } finally {
    client.release();
  }
  await pool.end();
}

main().catch((err) => {
  console.error("Failed to apply schema:", err.message);
  process.exit(1);
});