
const requireRole = require("../middleware/requireRole");

router.get("/pending", authMiddleware, requireRole(["principal"]), admissionController.getPendingAdmissions);
router.post("/:id/approve", authMiddleware, requireRole(["principal"]), admissionController.approveAdmission);
router.post("/:id/reject", authMiddleware, requireRole(["principal"]), admissionController.rejectAdmission);
