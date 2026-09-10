const admissionModel = require("../models/admission.model");
const admissionModel = require("../models/admission.model");
const admissionService = require("../services/admission.service");
const { validateAdmission } = require("../utils/validators");
const { ApiError } = require("../middleware/errorHandler");
const { notifyAdmins } = require("../services/pushService");
const { sendAdmissionConfirmation } = require("../services/email.service");

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

  // Parent ko confirmation email — fire-and-forget
  sendAdmissionConfirmation({
    email,
    parentName,
    studentName,
    gradeApplied,
  }).catch((err) => console.error("Admission email failed:", err));

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

module.exports = {
  getPendingAdmissions,
  approveAdmission,
  rejectAdmission,
  getPendingAdmissions,
  approveAdmission,
  rejectAdmission, submit, list, getById, updateStatus };
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
    const result = await admissionModel.approveAdmissionAndCreateStudent(id, classId, req.user.id);
    res.json({ message: "Admission approved, student created", ...result });
  } catch (err) {
    console.error("approveAdmission error:", err);
    res.status(400).json({ error: err.message || "Failed to approve admission" });
  }
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
    const result = await admissionModel.approveAdmissionAndCreateStudent(id, classId, req.user.id);
    res.json({ message: "Admission approved, student created", ...result });
  } catch (err) {
    console.error("approveAdmission error:", err);
    res.status(400).json({ error: err.message || "Failed to approve admission" });
  }
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
