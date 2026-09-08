// Email notifications via SMTP (nodemailer) — works with Gmail SMTP,
// SendGrid SMTP relay, Brevo SMTP relay, or any standard SMTP provider,
// so you don't need to hard-code one vendor's SDK. If SMTP isn't
// configured yet, this logs instead of throwing, so forms still work
// end-to-end (saved to MySQL) before you've set up an email provider.

const nodemailer = require("nodemailer");
const env = require("../config/env");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!env.email.host || !env.email.user || !env.email.pass) return null;

  transporter = nodemailer.createTransport({
    host: env.email.host,
    port: env.email.port,
    secure: env.email.port === 465,
    auth: { user: env.email.user, pass: env.email.pass },
  });
  return transporter;
}

/**
 * Sends an email if SMTP is configured; otherwise logs what would have
 * been sent. Never throws — a notification failure should not fail the
 * form submission itself (the record is already saved in MySQL).
 */
async function sendMail({ to, subject, html }) {
  const t = getTransporter();

  if (!t) {
    console.log(`[email] SMTP not configured — would send to ${to}: "${subject}"`);
    return { sent: false, reason: "not_configured" };
  }

  try {
    await t.sendMail({
      from: env.email.from || env.email.user,
      to,
      subject,
      html,
    });
    return { sent: true };
  } catch (err) {
    console.error("[email] Failed to send:", err.message);
    return { sent: false, reason: "send_failed" };
  }
}

async function sendAdmissionConfirmation(admission) {
  return sendMail({
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
}

async function sendOtpEmail({ to, code, purpose = "verification" }) {
  const purposeText = purpose === "password_reset" ? "password reset" : "email verification";

  return sendMail({
    to,
    subject: `Your Sunrise Public School ${purposeText} code`,
    html: `
      <p>Your ${purposeText} code is:</p>
      <p><strong>${code}</strong></p>
      <p>This code expires soon. If you did not request it, you can ignore this email.</p>
    `,
  });
}

module.exports = { sendMail, sendAdmissionConfirmation, sendOtpEmail };
