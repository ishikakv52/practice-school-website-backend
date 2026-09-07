const announcementService = require("../services/announcement.service");
const { notifyParentsAndStudents } = require("../services/pushService");
const { ApiError } = require("../middleware/errorHandler");

async function send(req, res) {
  const { title, message } = req.body;

  if (!title || !message) {
    throw new ApiError(400, "Title and message are required");
  }

  const announcement = await announcementService.createAnnouncement({ title, message });

  // Parents/students ko push — fire-and-forget
  notifyParentsAndStudents(title, message).catch((err) =>
    console.error("Push notify failed:", err)
  );

  res.status(201).json({
    success: true,
    data: announcement,
    message: "Announcement sent successfully.",
  });
}

async function list(req, res) {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
  const offset = parseInt(req.query.offset, 10) || 0;

  const announcements = await announcementService.listAnnouncements({ limit, offset });
  res.json({ success: true, data: announcements });
}

module.exports = { send, list };