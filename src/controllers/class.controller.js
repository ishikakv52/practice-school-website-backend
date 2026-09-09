const classService = require("../services/class.service");
const { ApiError } = require("../middleware/errorHandler");

async function createClass(req, res) {
  const name = req.body.name?.trim();
  const section = req.body.section?.trim();
  if (!name || !section) {
    throw new ApiError(400, "Class name and section are required");
  }

  const cls = await classService.adminCreateClass({ name, section });
  res.status(201).json({ success: true, data: cls });
}

async function listClasses(req, res) {
  const classes = await classService.listClasses();
  res.json({ success: true, data: classes });
}

async function assignTeacher(req, res) {
  const { teacherId } = req.body;
  if (!teacherId) {
    throw new ApiError(400, "teacherId is required");
  }

  const classes = await classService.assignTeacherToClass({
    teacherId,
    classId: req.params.id,
  });
  res.json({ success: true, data: classes });
}

async function unassignTeacher(req, res) {
  const classes = await classService.unassignTeacherFromClass({
    teacherId: req.params.teacherId,
    classId: req.params.id,
  });
  res.json({ success: true, data: classes });
}

async function listMyClasses(req, res) {
  const classes = await classService.listClassesForTeacher(req.user.id);
  res.json({ success: true, data: classes });
}

module.exports = { createClass, listClasses, assignTeacher, unassignTeacher, listMyClasses };
