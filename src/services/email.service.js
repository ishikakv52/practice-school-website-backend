// Email notifications via Brevo's HTTP API (not SMTP — Render's free tier
// blocks outbound SMTP ports, so we send over HTTPS instead). Fails
// gracefully (logs instead of throwing) if BREVO_API_KEY isn't configured,
// so forms still work end-to-end before email is set up.
// Uses @getbrevo/brevo v6.x (BrevoClient) API.

const { BrevoClient } = require("@getbrevo/brevo");
const env = require("../config/env");
const userModel = require("../models/user.model");

const SCHOOL_NAME = "Nexa Hub School";

let client = null;

function getClient() {
  if (client) return client;
  if (!env.email.brevoApiKey) return null;

  client = new BrevoClient({ apiKey: env.email.brevoApiKey });
  return client;
}

// --- Shared HTML layout so every email looks consistent ---

function layout({ title, bodyHtml, footerNote }) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden;">
      <div style="background: #1d4ed8; color: #ffffff; padding: 20px 24px;">
        <h2 style="margin: 0; font-size: 18px;">${SCHOOL_NAME}</h2>
        <p style="margin: 4px 0 0; font-size: 14px; opacity: 0.85;">${title}</p>
      </div>
      <div style="padding: 24px; background: #ffffff; color: #222222; font-size: 14px; line-height: 1.6;">
        ${bodyHtml}
      </div>
      <div style="padding: 16px 24px; background: #f7f7f7; color: #777777; font-size: 12px;">
        ${footerNote || SCHOOL_NAME}
      </div>
    </div>
  `;
}

function detailsTable(rows) {
  const cells = rows
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding: 6px 8px; border-bottom: 1px solid #eeeeee; color:#666666; width:40%;">${label}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #eeeeee;">${value}</td>
        </tr>
      `
    )
    .join("");
  return `<table style="width:100%; border-collapse: collapse; margin: 12px 0;">${cells}</table>`;
}

function actionButton(link, label) {
  if (!link) return "";
  return `<a href="${link}" style="display:inline-block; margin-top:16px; padding:10px 18px; background:#1d4ed8; color:#ffffff; text-decoration:none; border-radius:6px; font-size:14px;">${label}</a>`;
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
      sender: { name: SCHOOL_NAME, email: env.email.from || env.email.user },
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

// --- Template builders (pure — just return html, don't send) ---
// Used by enquiry.service.js / admission.service.js to build the html they
// pass into sendAdminNotification(), so the recipient-lookup logic there
// doesn't have to change.

function buildEnquiryNotificationHtml({ name, email, subject, message, submittedAt }) {
  return layout({
    title: "New Enquiry Received",
    bodyHtml: `
      <p>A new enquiry has been submitted through the website.</p>
      ${detailsTable([
        ["Name", name],
        ["Email", email],
        ["Subject", subject],
        ["Message", message],
        ["Submitted On", submittedAt],
      ])}
    `,
    footerNote: "Automated Notification — " + SCHOOL_NAME,
  });
}

function buildAdmissionNotificationHtml({
  studentName,
  gradeApplied,
  parentName,
  phone,
  email,
  message,
  submittedAt,
  actionLink,
  actionLabel,
}) {
  return layout({
    title: "New Admission Application",
    bodyHtml: `
      <p>A new admission application has been submitted.</p>
      ${detailsTable([
        ["Student Name", studentName],
        ["Applied For Class", gradeApplied],
        ["Parent/Guardian Name", parentName],
        ["Contact Number", phone],
        ["Email", email],
        ["Message", message],
        ["Submitted On", submittedAt],
      ])}
      ${actionButton(actionLink, actionLabel || "View Application")}
    `,
    footerNote: "Automated Notification — " + SCHOOL_NAME,
  });
}

// --- Individual send functions (signatures unchanged from before) ---

async function sendAdmissionConfirmation(admission) {
  return sendMail({
    to: admission.email,
    subject: `Application Received — ${SCHOOL_NAME}`,
    html: layout({
      title: "Admission Application Received",
      bodyHtml: `
        <p>Dear ${admission.parentName},</p>
        <p>Thank you for submitting an admission application for
        <strong>${admission.studentName}</strong> to ${SCHOOL_NAME}. We have
        successfully received your application.</p>
        ${detailsTable([
          ["Student Name", admission.studentName],
          ["Applied For Class", admission.gradeApplied],
        ])}
        <p>Our admissions team will review your application and get back to
        you shortly. You will receive another email once a decision has been
        made.</p>
      `,
    }),
  });
}

// Parent ko tab bhejta hai jab principal admission approve kar deta hai
// aur student record ban jaata hai.
async function sendAdmissionApproved({ to, parentName, studentName, admissionNumber, className }) {
  return sendMail({
    to,
    subject: `Admission Approved — ${studentName}`,
    html: layout({
      title: "Admission Approved",
      bodyHtml: `
        <p>Dear ${parentName},</p>
        <p>We are pleased to inform you that <strong>${studentName}</strong>'s
        admission to ${SCHOOL_NAME} has been <strong>APPROVED</strong>.
        Congratulations!</p>
        ${detailsTable([
          ["Allocated Class", className],
          ["Admission Number", admissionNumber],
        ])}
      `,
    }),
  });
}

// Teacher ko tab bhejta hai jab use ek class assign ki jaati hai.
async function sendClassAssigned({ to, teacherName, className }) {
  return sendMail({
    to,
    subject: `You Have Been Assigned to ${className}`,
    html: layout({
      title: "Class Assignment",
      bodyHtml: `
        <p>Dear ${teacherName},</p>
        <p>You have been assigned as a teacher for the following class:</p>
        ${detailsTable([["Class", className]])}
      `,
    }),
  });
}

// Teacher ko tab bhejta hai jab uski class mein naya student add hota hai
// (chahe admission approval se ho ya admin dwara directly add kiya gaya ho).
async function sendNewStudentAdded({ to, teacherName, studentName, className }) {
  return sendMail({
    to,
    subject: `New Student Added to ${className}`,
    html: layout({
      title: "New Student Added to Your Class",
      bodyHtml: `
        <p>Dear ${teacherName},</p>
        <p>A new student has been added to your class:</p>
        ${detailsTable([
          ["Student Name", studentName],
          ["Class", className],
        ])}
      `,
    }),
  });
}

async function sendOtpEmail({ to, code, purpose = "verification" }) {
  const purposeText = purpose === "password_reset" ? "password reset" : "email verification";

  return sendMail({
    to,
    subject: `Your ${SCHOOL_NAME} ${purposeText} code`,
    html: layout({
      title: purposeText === "password reset" ? "Password Reset Code" : "Email Verification Code",
      bodyHtml: `
        <p>Your ${purposeText} code is:</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">${code}</p>
        <p>This code expires soon. If you did not request it, you can ignore this email.</p>
      `,
    }),
  });
}

async function sendAnnouncementEmail({ to, title, message }) {
  return sendMail({
    to,
    subject: `School Announcement: ${title}`,
    html: layout({
      title: "School Announcement",
      bodyHtml: `
        <h3 style="margin-top:0;">${title}</h3>
        <p>${message}</p>
      `,
    }),
  });
}

// Parent ko bhejta hai jab fee payment successful ho jaaye.
async function sendFeePaymentSuccess({
  to,
  parentName,
  studentName,
  admissionNumber,
  className,
  feeMonth,
  amount,
}) {
  return sendMail({
    to,
    subject: `Fee Payment Successful — ${studentName}`,
    html: layout({
      title: "Fee Payment Successful",
      bodyHtml: `
        <p>Dear ${parentName},</p>
        <p>We have successfully received the fee payment for
        <strong>${studentName}</strong>.</p>
        ${detailsTable([
          ["Admission Number", admissionNumber],
          ["Student Name", studentName],
          ["Class", className],
          ["Fee Month", feeMonth],
          ["Amount Paid", amount ? `₹${amount}` : undefined],
        ])}
      `,
    }),
  });
}

// Parent ko bhejta hai jab fee payment fail ho jaaye.
async function sendFeePaymentFailed({
  to,
  parentName,
  studentName,
  admissionNumber,
  className,
  feeMonth,
  reason,
}) {
  return sendMail({
    to,
    subject: `Fee Payment Failed — ${studentName}`,
    html: layout({
      title: "Fee Payment Failed",
      bodyHtml: `
        <p>Dear ${parentName},</p>
        <p>Your fee payment attempt for <strong>${studentName}</strong> could
        not be completed.</p>
        ${detailsTable([
          ["Admission Number", admissionNumber],
          ["Student Name", studentName],
          ["Class", className],
          ["Fee Month", feeMonth],
          ["Reason", reason],
        ])}
        <p>Please try again from the Parent Dashboard.</p>
      `,
    }),
  });
}

async function sendEnquiryConfirmation({ to, name, subject, message, submittedAt }) {
  return sendMail({
    to,
    subject: "We've Received Your Enquiry",
    html: layout({
      title: "Thank You for Contacting Us",
      bodyHtml: `
        <p>Dear ${name},</p>
        <p>Thank you for reaching out to ${SCHOOL_NAME}. We have received
        your enquiry and our team will get back to you shortly.</p>
        ${detailsTable([
          ["Subject", subject],
          ["Your Message", message],
          ["Submitted On", submittedAt],
        ])}
      `,
    }),
  });
}

module.exports = {
  sendMail,
  sendAdminNotification,
  buildEnquiryNotificationHtml,
  buildAdmissionNotificationHtml,
  sendAdmissionConfirmation,
  sendAdmissionApproved,
  sendClassAssigned,
  sendNewStudentAdded,
  sendAnnouncementEmail,
  sendOtpEmail,
  sendEnquiryConfirmation,
  sendFeePaymentSuccess,
  sendFeePaymentFailed,
};
