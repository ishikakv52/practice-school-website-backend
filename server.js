const app = require("./src/app");
const env = require("./src/config/env");
const { checkConnection } = require("./src/config/db");

async function start() {
  const dbConnected = await checkConnection();
  if (!dbConnected) {
    console.warn(
      "[server] Starting without a confirmed database connection — " +
        "check backend/.env, then GET /api/health once the server is up."
    );
  }

  app.listen(env.port, () => {
    console.log(`[server] Listening on http://localhost:${env.port}`);
    console.log(`[server] Health check: http://localhost:${env.port}/api/health`);
  });
}

start();