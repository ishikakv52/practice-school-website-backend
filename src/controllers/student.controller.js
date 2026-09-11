const studentService = require("../services/student.service");
const classModel = require("../models/class.model");
const emailService = require("../services/email.service");
const { ApiError } = require("../middleware/errorHandler");

async function createStudent(req, res) {
  const name = req.body.name?.trim();
  const { classId, rollNumber, fatherName, admissionNumber } = req.body;
  if (!name || !classId) {
    throw new ApiError(400, "Student name and classId are required");
  }

  const student = await studentService.adminCreateStudent({
    name,
    classId,
    rollNumber,
    fatherName,
    admissionNumber,
  });

  // Us class ke assigned teacher(s) ko notify — fire-and-forget, response ko block nahi karega
  notifyClassTeachers({ classId, studentName: name }).catch((err) =>
    console.error("Teacher new-student email failed:", err.message)
  );

  res.status(201).json({ success: true, data: student });
}

async function notifyClassTeachers({ classId, studentName }) {
  const cls = await classModel.findClassById(classId);
  const className = cls ? `${cls.name} - ${cls.section}` : "";

  const teachers = await classModel.listTeachersForClass(classId);
  teachers.forEach((teacher) => {
    emailService
      .sendNewStudentAdded({
        to: teacher.email,
        teacherName: teacher.name,
        studentName,
        className,
      })
      .catch((err) => console.error("Teacher new-student email failed:", err.message));
  });
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
