// One-time setup script to create the first admin user, since there's
// no public admin sign-up (by design — admin accounts shouldn't be
// self-service). Run from the backend/ folder:
//
//   ADMIN_NAME="Principal" ADMIN_EMAIL="admin@sunrisepublicschool.edu" \
//   ADMIN_PASSWORD="choose-a-strong-password" node scripts/seedAdmin.js

const userModel = require("../src/models/user.model");
const authService = require("../src/services/auth.service");
const { pool } = require("../src/config/db");

async function main() {
  const name = process.env.ADMIN_NAME;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!name || !email || !password) {
    console.error(
      "Usage: ADMIN_NAME=... ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/seedAdmin.js"
    );
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("ADMIN_PASSWORD must be at least 8 characters.");
    process.exit(1);
  }

  const existing = await userModel.findByEmail(email);
  if (existing) {
    console.error(`A user with email ${email} already exists.`);
    process.exit(1);
  }

  const passwordHash = await authService.hashPassword(password);
  const user = await userModel.createUser({ name, email, passwordHash, role: "admin" });

  console.log(`Admin user created: ${user.email} (id ${user.id})`);
  await pool.end();
}

main().catch((err) => {
  console.error("Failed to seed admin user:", err.message);
  process.exit(1);
});
