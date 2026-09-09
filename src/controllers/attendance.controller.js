const attendanceService = require("../services/attendance.service");
const { ApiError } = require("../middleware/errorHandler");

async function markAttendance(req, res) {
  const { classId, date, records } = req.body;
  if (!classId || !date) {
    throw new ApiError(400, "classId and date are required");
  }

  const saved = await attendanceService.teacherMarkAttendance({
    teacher: req.user,
    classId,
    date,
    records,
  });
  res.status(201).json({ success: true, data: saved });
}

async function getAttendance(req, res) {
  const { classId, date } = req.query;
  if (!classId || !date) {
    throw new ApiError(400, "classId and date query params are required");
  }

  const data = await attendanceService.getAttendance({ user: req.user, classId, date });
  res.json({ success: true, data });
}

module.exports = { markAttendance, getAttendance };
