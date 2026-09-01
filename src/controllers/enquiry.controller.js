const enquiryService = require("../services/enquiry.service");
const { validateEnquiry } = require("../utils/validators");
const { ApiError } = require("../middleware/errorHandler");

async function submit(req, res) {
  const errors = validateEnquiry(req.body);
  if (errors.length > 0) {
    throw new ApiError(400, "Validation failed", errors);
  }

  const { name, email, subject, message } = req.body;
  const enquiry = await enquiryService.submitEnquiry({ name, email, subject, message });

  res.status(201).json({
    success: true,
    data: { id: enquiry.id },
    message: "Thank you! Your message has been received.",
  });
}

// --- Admin-only (mounted behind requireAuth + requireRole("admin")) ---

async function list(req, res) {
  const { status } = req.query;
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
  const offset = parseInt(req.query.offset, 10) || 0;

  const enquiries = await enquiryService.listEnquiries({ status, limit, offset });
  res.json({ success: true, data: enquiries });
}

async function getById(req, res) {
  const enquiry = await enquiryService.getEnquiryById(req.params.id);
  if (!enquiry) throw new ApiError(404, "Enquiry not found");
  res.json({ success: true, data: enquiry });
}

async function updateStatus(req, res) {
  const { status } = req.body;
  const allowed = ["new", "read", "responded"];
  if (!allowed.includes(status)) {
    throw new ApiError(400, `Status must be one of: ${allowed.join(", ")}`);
  }

  const existing = await enquiryService.getEnquiryById(req.params.id);
  if (!existing) throw new ApiError(404, "Enquiry not found");

  const updated = await enquiryService.updateEnquiryStatus(req.params.id, status);
  res.json({ success: true, data: updated });
}

module.exports = { submit, list, getById, updateStatus };
