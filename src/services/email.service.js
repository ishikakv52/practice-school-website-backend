// Email notifications via Brevo's HTTP API (not SMTP — Render's free tier
// blocks outbound SMTP ports, so we send over HTTPS instead). Fails
// gracefully (logs instead of throwing) if BREVO_API_KEY isn't configured,
// so forms still work end-to-end before email is set up.
// Uses @getbrevo/brevo v6.x (BrevoClient) API.

const { BrevoClient } = require("@getbrevo/brevo");
const env = require("../config/env");
const userModel = require("../models/user.model");

let client = null;

function getClient() {
  if (client) return client;
  if (!env.email.brevoApiKey) return null;

  client = new BrevoClient({ apiKey: env.email.brevoApiKey });
  return client;
}

/**
 * Sends an email if Brevo is configured; otherwise logs what would have
 * been sent. Never throws — a notification failure should not fail the
 * form submission itself (the record is already saved in the DB).
 */
async function sendMail({ to, subject, html }) {
  const brevo = getClient();

  if (!brevo) {
    console.log(`[email] Brevo not configured — would send to ${to}: "${subject}"`);
    return { sent: false, reason: "not_configured" };
  }

  try {
    await brevo.transactionalEmails.sendTransacEmail({
      sender: { name: "Nexa Hub School", email: env.email.from || env.email.user },
      to: to.split(",").map((email) => ({ email: email.trim() })),
      subject,
      htmlContent: html,
    });
    return { sent: true };
  } catch (err) {
    console.error("[email] Failed to send:", err.message || err);
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
