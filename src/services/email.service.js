// Email notifications via SMTP (nodemailer) — works with Gmail SMTP,
// SendGrid SMTP relay, Brevo SMTP relay, or any standard SMTP provider,
// so you don't need to hard-code one vendor's SDK. If SMTP isn't
// configured yet, this logs instead of throwing, so forms still work
// end-to-end (saved to MySQL) before you've set up an email provider.

const nodemailer = require("nodemailer");
const env = require("../config/env");
const userModel = require("../models/user.model");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!env.email.host || !env.email.user || !env.email.pass) return null;

  transporter = nodemailer.createTransport({
    host: env.email.host,
    port: env.email.port,
    secure: env.email.port === 465,
    auth: { user: env.email.user, pass: env.email.pass },
    // Without these, a slow/unreachable SMTP host can hang the whole
    // request for minutes (observed: ~4 min). Fail fast instead.
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
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

// Admin + Principal accounts (from DB) ko ek saath notify karta hai.
async function sendAdminNotification({ subject, html }) {
  const emails = await userModel.listAdminPrincipalEmails();
  if (emails.length === 0) {
    console.log(`[email] No admin/principal accounts to notify — would send: "${subject}"`);
    return { sent: false, reason: "no_recipients" };
  }
  return sendMail({ to: emails.join(","), subject, html });
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

// Parent ko tab bhejta hai jab principal admission approve kar deta hai
// aur student record ban jaata hai.
async function sendAdmissionApproved({ to, parentName, studentName, admissionNumber, className }) {
  return sendMail({
    to,
    subject: `Admission approved — ${studentName}`,
    html: `
      <p>Dear ${parentName},</p>
      <p>We're happy to confirm that <strong>${studentName}</strong>'s admission has been
      approved for <strong>${className}</strong>.</p>
      <p>Admission Number: <strong>${admissionNumber}</strong></p>
      <p>— Sunrise Public School</p>
    `,
  });
}

// Teacher ko tab bhejta hai jab use ek class assign ki jaati hai.
async function sendClassAssigned({ to, teacherName, className }) {
  return sendMail({
    to,
    subject: `You've been assigned to ${className}`,
    html: `
      <p>Dear ${teacherName},</p>
      <p>You have been assigned as a teacher for <strong>${className}</strong>.</p>
      <p>— Sunrise Public School</p>
    `,
  });
}

// Teacher ko tab bhejta hai jab uski class mein naya student add hota hai
// (chahe admission approval se ho ya admin dwara directly add kiya gaya ho).
async function sendNewStudentAdded({ to, teacherName, studentName, className }) {
  return sendMail({
    to,
    subject: `New student added to ${className}`,
    html: `
      <p>Dear ${teacherName},</p>
      <p><strong>${studentName}</strong> has been added to your class,
      <strong>${className}</strong>.</p>
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

async function sendAnnouncementEmail({ to, title, message }) {
  return sendMail({
    to,
    subject: `School announcement: ${title}`,
    html: `
      <h2>${title}</h2>
      <p>${message}</p>
      <p>— Sunrise Public School</p>
    `,
  });
}

module.exports = {
  sendMail,
  sendAdminNotification,
  sendAdmissionConfirmation,
  sendAdmissionApproved,
  sendClassAssigned,
  sendNewStudentAdded,
  sendAnnouncementEmail,
  sendOtpEmail,
};
