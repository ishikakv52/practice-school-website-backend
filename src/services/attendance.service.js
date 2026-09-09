const attendanceModel = require("../models/attendance.model");
const studentModel = require("../models/student.model");
const classModel = require("../models/class.model");
const { ApiError } = require("../middleware/errorHandler");

const VALID_STATUSES = ["present", "absent", "late"];

async function teacherMarkAttendance({ teacher, classId, date, records }) {
  const cls = await classModel.findClassById(classId);
  if (!cls) {
    throw new ApiError(404, "Class not found");
  }

  const assigned = await classModel.isTeacherAssignedToClass(teacher.id, classId);
  if (!assigned) {
    throw new ApiError(403, "You're not assigned to this class");
  }

  if (!Array.isArray(records) || records.length === 0) {
    throw new ApiError(400, "At least one attendance record is required");
  }

  for (const r of records) {
    if (!r.studentId || !VALID_STATUSES.includes(r.status)) {
      throw new ApiError(400, `Each record needs a studentId and a status of: ${VALID_STATUSES.join(", ")}`);
    }
  }

  const studentIds = records.map((r) => r.studentId);
  const validCount = await studentModel.countStudentsMatchingClass(studentIds, classId);
  if (validCount !== new Set(studentIds).size) {
    throw new ApiError(400, "One or more students don't belong to this class");
  }

  const toSave = records.map((r) => ({
    studentId: r.studentId,
    classId,
    date,
    status: r.status,
    markedBy: teacher.id,
  }));

  return attendanceModel.upsertAttendanceRecords(toSave);
}

async function getAttendance({ user, classId, date }) {
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

  const [students, records] = await Promise.all([
    studentModel.listStudentsByClass(classId),
    attendanceModel.getAttendanceByClassAndDate(classId, date),
  ]);

  const byStudent = new Map(records.map((r) => [r.student_id, r]));

  return students.map((s) => ({
    studentId: s.id,
    name: s.name,
    rollNumber: s.roll_number,
    status: byStudent.get(s.id)?.status || null,
  }));
}

module.exports = { teacherMarkAttendance, getAttendance };
