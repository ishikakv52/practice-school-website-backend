const admissionService = require("../services/admission.service");
const { validateAdmission } = require("../utils/validators");
const { ApiError } = require("../middleware/errorHandler");

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

module.exports = { submit, list, getById, updateStatus };
