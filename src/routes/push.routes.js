const express = require("express");
const router = express.Router();
const pool = require("../db"); // apna existing pg pool import karo — path check kar lena
const webpush = require("../config/webpush");

router.post("/subscribe", async (req, res) => {
  const { endpoint, keys, userType } = req.body;

  if (!endpoint || !keys?.p256dh || !keys?.auth || !userType) {
    return res.status(400).json({ error: "Missing subscription data" });
  }

  try {
    await pool.query(
      `INSERT INTO push_subscriptions (endpoint, keys_p256dh, keys_auth, user_type)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (endpoint) DO UPDATE
       SET keys_p256dh = EXCLUDED.keys_p256dh,
           keys_auth = EXCLUDED.keys_auth,
           user_type = EXCLUDED.user_type`,
      [endpoint, keys.p256dh, keys.auth, userType]
    );
    res.status(201).json({ message: "Subscribed successfully" });
  } catch (err) {
    console.error("Subscribe error:", err);
    res.status(500).json({ error: "Failed to save subscription" });
  }
});

router.post("/send-test", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM push_subscriptions");

    const payload = JSON.stringify({
      title: "Test Notification",
      body: "Push notifications working! 🎉",
    });

    const results = await Promise.allSettled(
      rows.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
          },
          payload
        )
      )
    );

    res.json({ sent: results.length });
  } catch (err) {
    console.error("Send error:", err);
    res.status(500).json({ error: "Failed to send notifications" });
  }
});

module.exports = router;