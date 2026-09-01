const enquiryModel = require("../models/enquiry.model");
const emailService = require("./email.service");
const env = require("../config/env");

async function submitEnquiry(data) {
  const enquiry = await enquiryModel.createEnquiry(data);

  // Notify the school office. Fire-and-forget-ish: we await it so we can
  // log failures, but a failed email never fails the API response —
  // the enquiry is already safely stored.
  if (env.email.schoolNotifyAddress) {
    await emailService.sendMail({
      to: env.email.schoolNotifyAddress,
      subject: `New enquiry: ${enquiry.subject}`,
      html: `
        <p><strong>From:</strong> ${enquiry.name} (${enquiry.email})</p>
        <p><strong>Subject:</strong> ${enquiry.subject}</p>
        <p>${enquiry.message}</p>
      `,
    });
  }

  // Confirmation email to the person who submitted the form.
  await emailService.sendMail({
    to: enquiry.email,
    subject: "We've received your enquiry — Sunrise Public School",
    html: `
      <p>Dear ${enquiry.name},</p>
      <p>Thank you for reaching out. We've received your enquiry regarding
      "${enquiry.subject}" and will get back to you shortly.</p>
      <p>— Sunrise Public School</p>
    `,
  });

  return enquiry;
}

module.exports = {
  submitEnquiry,
  listEnquiries: enquiryModel.listEnquiries,
  getEnquiryById: enquiryModel.getEnquiryById,
  updateEnquiryStatus: enquiryModel.updateEnquiryStatus,
};
