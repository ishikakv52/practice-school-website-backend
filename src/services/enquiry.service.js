const enquiryModel = require("../models/enquiry.model");
const emailService = require("./email.service");
const env = require("../config/env");

async function submitEnquiry(data) {
  const enquiry = await enquiryModel.createEnquiry(data);

  const notifyHtml = `
    <p><strong>From:</strong> ${enquiry.name} (${enquiry.email})</p>
    <p><strong>Subject:</strong> ${enquiry.subject}</p>
    <p>${enquiry.message}</p>
  `;

  // Emails are fire-and-forget — a slow/failed SMTP send should never
  // delay or fail the API response. The enquiry is already saved.

  // Admin/Principal accounts (from DB)
  emailService
    .sendAdminNotification({
      subject: `New enquiry: ${enquiry.subject}`,
      html: notifyHtml,
    })
    .catch((err) => console.error("Admin notify email failed:", err.message));

  // Optional shared office inbox (env var), separate from admin/principal accounts
  if (env.email.schoolNotifyAddress) {
    emailService
      .sendMail({
        to: env.email.schoolNotifyAddress,
        subject: `New enquiry: ${enquiry.subject}`,
        html: notifyHtml,
      })
      .catch((err) => console.error("School notify email failed:", err.message));
  }

  emailService
    .sendMail({
      to: enquiry.email,
      subject: "We've received your enquiry — Sunrise Public School",
      html: `
        <p>Dear ${enquiry.name},</p>
        <p>Thank you for reaching out. We've received your enquiry regarding
        "${enquiry.subject}" and will get back to you shortly.</p>
        <p>— Sunrise Public School</p>
      `,
    })
    .catch((err) => console.error("Enquiry confirmation email failed:", err.message));

  return enquiry;
}

module.exports = {
  submitEnquiry,
  listEnquiries: enquiryModel.listEnquiries,
  getEnquiryById: enquiryModel.getEnquiryById,
  updateEnquiryStatus: enquiryModel.updateEnquiryStatus,
};
