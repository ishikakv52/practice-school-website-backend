const enquiryModel = require("../models/enquiry.model");
const emailService = require("./email.service");
const env = require("../config/env");

async function submitEnquiry(data) {
  const enquiry = await enquiryModel.createEnquiry(data);
  const submittedAt = new Date().toLocaleString("en-IN");

  const notifyHtml = emailService.buildEnquiryNotificationHtml({
    name: enquiry.name,
    email: enquiry.email,
    subject: enquiry.subject,
    message: enquiry.message,
    submittedAt,
  });

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
    .sendEnquiryConfirmation({
      to: enquiry.email,
      name: enquiry.name,
      subject: enquiry.subject,
      message: enquiry.message,
      submittedAt,
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
