// Minimal validation helper — no extra dependency needed for the simple
// required/format checks these two forms need. Returns an array of
// human-readable error strings; empty array means valid.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Accepts optional +, digits, spaces, hyphens — 7 to 15 digits total.
const PHONE_RE = /^\+?[0-9\s-]{7,15}$/;

function required(value, label, errors) {
  if (value === undefined || value === null || String(value).trim() === "") {
    errors.push(`${label} is required`);
    return false;
  }
  return true;
}

function validateEnquiry(body) {
  const errors = [];
  const { name, email, subject, message } = body;

  if (required(name, "Name", errors) && String(name).length > 150) {
    errors.push("Name must be under 150 characters");
  }
  if (required(email, "Email", errors) && !EMAIL_RE.test(email)) {
    errors.push("Email is not a valid email address");
  }
  required(subject, "Subject", errors);
  required(message, "Message", errors);

  return errors;
}

function validateAdmission(body) {
  const errors = [];
  const {
    studentName,
    dateOfBirth,
    gradeApplied,
    parentName,
    phone,
    email,
  } = body;

  required(studentName, "Student name", errors);
  if (required(dateOfBirth, "Date of birth", errors) && isNaN(Date.parse(dateOfBirth))) {
    errors.push("Date of birth is not a valid date");
  }
  required(gradeApplied, "Grade applied for", errors);
  required(parentName, "Parent/guardian name", errors);
  if (required(phone, "Phone number", errors) && !PHONE_RE.test(phone)) {
    errors.push("Phone number is not valid");
  }
  if (required(email, "Email", errors) && !EMAIL_RE.test(email)) {
    errors.push("Email is not a valid email address");
  }

  return errors;
}

module.exports = { validateEnquiry, validateAdmission };
