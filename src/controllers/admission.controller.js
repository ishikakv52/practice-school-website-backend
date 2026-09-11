const admissionModel = require("../models/admission.model");
const admissionService = require("../services/admission.service");
const classModel = require("../models/class.model");
const emailService = require("../services/email.service");
const { validateAdmission } = require("../utils/validators");
const { ApiError } = require("../middleware/errorHandler");
const { notifyAdmins } = require("../services/pushService");

async function submit(req, res) {
  const errors = validateAdmission(req.body);
  if (errors.length > 0) {
    throw new ApiError(400, "Validation failed", errors);
  }

  const { studentName, dateOfBirth, gradeApplied, parentName, phone, email, message } =
    req.body;

  const admission = await admissionService.submitAdmission({
    studentName,
    dateOfBirth,
    gradeApplied,
    parentName,
    phone,
    email,
    message,
  });

  // Admin ko push notify — fire-and-forget, response ko block nahi karega
  notifyAdmins(
    "New Admission Application",
    `${studentName} — Grade ${gradeApplied}`
  ).catch((err) => console.error("Push notify failed:", err));

  // Admin/Principal + parent confirmation emails admissionService.submitAdmission()
  // ke andar hi fire-and-forget bhej di jaati hain — yahan dubara nahi bhejni.

  res.status(201).json({
    success: true,
    data: { id: admission.id },
    message: "Application submitted! Our admissions team will contact you shortly.",
  });
}

// --- Admin-only (mounted behind requireAuth + requireRole("admin")) ---

async function list(req, res) {
  const { status } = req.query;
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
  const offset = parseInt(req.query.offset, 10) || 0;

  const admissions = await admissionService.listAdmissions({ status, limit, offset });
  res.json({ success: true, data: admissions });
}

async function getById(req, res) {
  const admission = await admissionService.getAdmissionById(req.params.id);
  if (!admission) throw new ApiError(404, "Admission application not found");
  res.json({ success: true, data: admission });
}

async function updateStatus(req, res) {
  const { status } = req.body;
  const allowed = ["pending", "under_review", "accepted", "rejected"];
  if (!allowed.includes(status)) {
    throw new ApiError(400, `Status must be one of: ${allowed.join(", ")}`);
  }

  const existing = await admissionService.getAdmissionById(req.params.id);
  if (!existing) throw new ApiError(404, "Admission application not found");

  const updated = await admissionService.updateAdmissionStatus(req.params.id, status);
  res.json({ success: true, data: updated });
}

module.exports = { submit, list, getById, updateStatus, getPendingAdmissions, approveAdmission, rejectAdmission };

async function getPendingAdmissions(req, res) {
  try {
    const admissions = await admissionModel.findPendingAdmissions();
    res.json({ admissions });
  } catch (err) {
    console.error("getPendingAdmissions error:", err);
    res.status(500).json({ error: "Failed to fetch pending admissions" });
  }
}

async function approveAdmission(req, res) {
  const { id } = req.params;
  const { classId } = req.body;
  if (!classId) return res.status(400).json({ error: "classId is required to approve admission" });
  try {
    // Approve se pehle admission details nikal lo (email/parentName/studentName
    // approve hone ke baad bhi admissions row me hi rehte hain, but yahin le lete hain)
    const admission = await admissionModel.findAdmissionById(id);
    const result = await admissionModel.approveAdmissionAndCreateStudent(id, classId, req.user.id);

    // Parent + assigned teacher(s) ko notify — fire-and-forget, response ko block nahi karega
    notifyApprovalStakeholders({ admission, classId, admissionNumber: result.admissionNumber }).catch(
      (err) => console.error("Approval notification failed:", err.message)
    );

    res.json({ message: "Admission approved, student created", ...result });
  } catch (err) {
    console.error("approveAdmission error:", err);
    res.status(400).json({ error: err.message || "Failed to approve admission" });
  }
}

async function notifyApprovalStakeholders({ admission, classId, admissionNumber }) {
  if (!admission) return;

  const cls = await classModel.findClassById(classId);
  const className = cls ? `${cls.name} - ${cls.section}` : "";

  // Parent ko admission-approved confirmation
  if (admission.email) {
    emailService
      .sendAdmissionApproved({
        to: admission.email,
        parentName: admission.parent_name,
        studentName: admission.student_name,
        admissionNumber,
        className,
      })
      .catch((err) => console.error("Parent approval email failed:", err.message));
  }

  // Us class ke saare assigned teacher(s) ko naye student ki notification
  const teachers = await classModel.listTeachersForClass(classId);
  teachers.forEach((teacher) => {
    emailService
      .sendNewStudentAdded({
        to: teacher.email,
        teacherName: teacher.name,
        studentName: admission.student_name,
        className,
      })
      .catch((err) => console.error("Teacher new-student email failed:", err.message));
  });
}

async function rejectAdmission(req, res) {
  const { id } = req.params;
  const { reason } = req.body;
  try {
    const rejected = await admissionModel.rejectAdmission(id, req.user.id, reason);
    if (!rejected) return res.status(400).json({ error: "Admission not found or already reviewed" });
    res.json({ message: "Admission rejected", admission: rejected });
  } catch (err) {
    console.error("rejectAdmission error:", err);
    res.status(500).json({ error: "Failed to reject admission" });
  }
}
