const admissionModel = require("../models/admission.model");
const emailService = require("./email.service");
const env = require("../config/env");

async function submitAdmission(data) {
  const admission = await admissionModel.createAdmission(data);
  const submittedAt = new Date().toLocaleString("en-IN");

  // actionLink points at the admin/principal admissions list — same link for
  // both for now; role-based read-only vs approve/reject links would need
  // sendAdminNotification to send two separate emails instead of one shared
  // one, which is a bigger change than "just the templates".
  const notifyHtml = emailService.buildAdmissionNotificationHtml({
    studentName: admission.studentName,
    gradeApplied: admission.gradeApplied,
    parentName: admission.parentName,
    phone: admission.phone,
    email: admission.email,
    message: admission.message,
    submittedAt,
    actionLink: env.email.adminPortalUrl ? `${env.email.adminPortalUrl}/admissions` : undefined,
    actionLabel: "View Application",
  });

  // Emails are fire-and-forget — a slow/failed SMTP send should never
  // delay or fail the API response. The admission is already saved.

  // Admin/Principal accounts (from DB)
  emailService
    .sendAdminNotification({
      subject: `New admission application: ${admission.studentName}`,
      html: notifyHtml,
    })
    .catch((err) => console.error("Admin notify email failed:", err.message));

  // Optional shared office inbox (env var), separate from admin/principal accounts
  if (env.email.schoolNotifyAddress) {
    emailService
      .sendMail({
        to: env.email.schoolNotifyAddress,
        subject: `New admission application: ${admission.studentName}`,
        html: notifyHtml,
      })
      .catch((err) => console.error("School notify email failed:", err.message));
  }

  emailService
    .sendAdmissionConfirmation(admission)
    .catch((err) => console.error("Admission confirmation email failed:", err.message));

  return admission;
}

module.exports = {
  submitAdmission,
  listAdmissions: admissionModel.listAdmissions,
  getAdmissionById: admissionModel.getAdmissionById,
  updateAdmissionStatus: admissionModel.updateAdmissionStatus,
};
