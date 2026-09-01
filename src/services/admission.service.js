const admissionModel = require("../models/admission.model");
const emailService = require("./email.service");
const env = require("../config/env");

async function submitAdmission(data) {
  const admission = await admissionModel.createAdmission(data);

  if (env.email.schoolNotifyAddress) {
    await emailService.sendMail({
      to: env.email.schoolNotifyAddress,
      subject: `New admission application: ${admission.studentName}`,
      html: `
        <p><strong>Student:</strong> ${admission.studentName} (DOB: ${admission.dateOfBirth})</p>
        <p><strong>Grade applied for:</strong> ${admission.gradeApplied}</p>
        <p><strong>Parent/Guardian:</strong> ${admission.parentName}</p>
        <p><strong>Contact:</strong> ${admission.phone} / ${admission.email}</p>
        ${admission.message ? `<p><strong>Message:</strong> ${admission.message}</p>` : ""}
      `,
    });
  }

  await emailService.sendMail({
    to: admission.email,
    subject: "Application received — Sunrise Public School",
    html: `
      <p>Dear ${admission.parentName},</p>
      <p>We've received the admission application for
      <strong>${admission.studentName}</strong> for
      <strong>${admission.gradeApplied}</strong>. Our admissions team will
      review it and contact you shortly.</p>
      <p>— Sunrise Public School</p>
    `,
  });

  return admission;
}

module.exports = {
  submitAdmission,
  listAdmissions: admissionModel.listAdmissions,
  getAdmissionById: admissionModel.getAdmissionById,
  updateAdmissionStatus: admissionModel.updateAdmissionStatus,
};
