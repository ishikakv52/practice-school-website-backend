const admissionModel = require("../models/admission.model");
const emailService = require("./email.service");
const env = require("../config/env");

async function submitAdmission(data) {
  const admission = await admissionModel.createAdmission(data);

  const notifyHtml = `
    <p><strong>Student:</strong> ${admission.studentName} (DOB: ${admission.dateOfBirth})</p>
    <p><strong>Grade applied for:</strong> ${admission.gradeApplied}</p>
    <p><strong>Parent/Guardian:</strong> ${admission.parentName}</p>
    <p><strong>Contact:</strong> ${admission.phone} / ${admission.email}</p>
    ${admission.message ? `<p><strong>Message:</strong> ${admission.message}</p>` : ""}
  `;

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
