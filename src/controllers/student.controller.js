const studentService = require("../services/student.service");
const { ApiError } = require("../middleware/errorHandler");

async function createStudent(req, res) {
  const name = req.body.name?.trim();
  const { classId, rollNumber } = req.body;
  if (!name || !classId) {
    throw new ApiError(400, "Student name and classId are required");
  }

  const student = await studentService.adminCreateStudent({ name, classId, rollNumber });
  res.status(201).json({ success: true, data: student });
}

async function listStudents(req, res) {
  const { classId } = req.query;
  if (!classId) {
    throw new ApiError(400, "classId query param is required");
  }

  const students = await studentService.listStudentsForUser({ classId, user: req.user });
  res.json({ success: true, data: students });
}

module.exports = { createStudent, listStudents };
