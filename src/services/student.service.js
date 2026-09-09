const studentModel = require("../models/student.model");
const classModel = require("../models/class.model");
const { ApiError } = require("../middleware/errorHandler");

async function adminCreateStudent({ name, classId, rollNumber }) {
  const cls = await classModel.findClassById(classId);
  if (!cls) {
    throw new ApiError(404, "Class not found");
  }
  return studentModel.createStudent({ name, classId, rollNumber });
}

async function listStudentsForUser({ classId, user }) {
  const cls = await classModel.findClassById(classId);
  if (!cls) {
    throw new ApiError(404, "Class not found");
  }

  if (user.role === "teacher") {
    const assigned = await classModel.isTeacherAssignedToClass(user.id, classId);
    if (!assigned) {
      throw new ApiError(403, "You're not assigned to this class");
    }
  }

  return studentModel.listStudentsByClass(classId);
}

module.exports = { adminCreateStudent, listStudentsForUser };
