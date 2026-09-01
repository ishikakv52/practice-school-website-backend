// Central place where every /api/* router gets mounted. Later phases
// (admissions, enquiries, notices, events, news, gallery, teachers,
// students, payments, auth, chat) each get their own routes/*.routes.js
// file and get added here — app.js only ever imports this one file.

const express = require("express");
const healthRoutes = require("./health.routes");
const enquiriesRoutes = require("./enquiries.routes");
const admissionsRoutes = require("./admissions.routes");
const authRoutes = require("./auth.routes");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/enquiries", enquiriesRoutes);
router.use("/admissions", admissionsRoutes);

// Later phases will add, e.g.:
// router.use("/notices", require("./notices.routes"));
// router.use("/events", require("./events.routes"));
// router.use("/news", require("./news.routes"));
// router.use("/gallery", require("./gallery.routes"));
// router.use("/teachers", require("./teachers.routes"));
// router.use("/students", require("./students.routes"));
// router.use("/payments", require("./payments.routes"));
// router.use("/chat", require("./chat.routes"));

module.exports = router;
