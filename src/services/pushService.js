const { pool } = require("../config/db");  // ✅ destructured
const webpush = require("../config/webpush");

async function sendToSubscriptions(subscriptions, title, body) {
  const payload = JSON.stringify({ title, body });

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
          },
          payload
        );
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await pool.query("DELETE FROM push_subscriptions WHERE id = $1", [sub.id]);
        } else {
          console.error("Push send error:", err);
        }
      }
    })
  );
}

async function notifyAdmins(title, body) {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM push_subscriptions WHERE user_type = $1",
      ["admin"]
    );
    await sendToSubscriptions(rows, title, body);
  } catch (err) {
    console.error("notifyAdmins error:", err);
  }
}

async function notifyParentsAndStudents(title, body) {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM push_subscriptions WHERE user_type IN ('parent', 'student')"
    );
    await sendToSubscriptions(rows, title, body);
  } catch (err) {
    console.error("notifyParentsAndStudents error:", err);
  }
}

module.exports = { notifyAdmins, notifyParentsAndStudents };