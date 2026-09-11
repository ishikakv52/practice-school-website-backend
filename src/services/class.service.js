const classModel = require("../models/class.model");
const userModel = require("../models/user.model");
const emailService = require("./email.service");
const { ApiError } = require("../middleware/errorHandler");

async function adminCreateClass({ name, section }) {
  try {
    return await classModel.createClass({ name, section });
  } catch (err) {
    if (err.code === "23505") {
      throw new ApiError(409, "This class and section already exists");
    }
    throw err;
  }
}

async function listClasses() {
  return classModel.listClasses();
}

async function assignTeacherToClass({ teacherId, classId }) {
  const teacher = await userModel.findById(teacherId);
  if (!teacher || teacher.role !== "teacher") {
    throw new ApiError(400, "That user is not a teacher account");
  }

  const cls = await classModel.findClassById(classId);
  if (!cls) {
    throw new ApiError(404, "Class not found");
  }

  await classModel.assignTeacher(teacherId, classId);

  // Teacher ko notify — fire-and-forget, response ko block nahi karega
  if (teacher.email) {
    emailService
      .sendClassAssigned({
        to: teacher.email,
        teacherName: teacher.name,
        className: `${cls.name} - ${cls.section}`,
      })
      .catch((err) => console.error("Class assignment email failed:", err.message));
  }

  return classModel.listClasses();
}

async function unassignTeacherFromClass({ teacherId, classId }) {
  await classModel.unassignTeacher(teacherId, classId);
  return classModel.listClasses();
}

async function listClassesForTeacher(teacherId) {
  return classModel.listClassesForTeacher(teacherId);
}

module.exports = {
  adminCreateClass,
  listClasses,
  assignTeacherToClass,
  unassignTeacherFromClass,
  listClassesForTeacher,
};
