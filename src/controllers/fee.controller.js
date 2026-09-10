const feeService = require("../services/fee.service");
const { ApiError } = require("../middleware/errorHandler");
const { generateCaptcha, verifyCaptcha } = require("../services/captcha.service");
const studentService = require("../services/student.service");

async function createOrder(req, res) {
  try {
    const { studentId, feeId } = req.body;
    if (!studentId || !feeId) {
      return res.status(400).json({ error: "studentId and feeId are required" });
    }
    const { order, fee } = await feeService.createFeeOrder(feeId, studentId);
    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      feeId: fee.id,
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Failed to create order" });
  }
}

async function verifyPayment(req, res) {
  try {
    const fee = await feeService.verifyAndMarkPaid(req.body);
    if (!fee) return res.status(404).json({ error: "Order not found" });
    res.json({ success: true, fee });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Verification failed" });
  }
}

async function listFees(req, res) {
  try {
    const fees = await feeService.getFeesByStudent(req.params.studentId);
    res.json(fees);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch fees" });
  }
}

async function getCaptcha(req, res) {
  const { svg, token } = generateCaptcha();
  res.json({ success: true, data: { svg, token } });
}

async function verifyStudent(req, res) {
  const { studentName, fatherName, admissionNumber, captchaInput, captchaToken } = req.body;

  if (!studentName || !fatherName || !admissionNumber || !captchaInput || !captchaToken) {
    throw new ApiError(400, "All fields including captcha are required");
  }

  if (!verifyCaptcha(captchaToken, captchaInput)) {
    throw new ApiError(400, "Invalid or expired captcha");
  }

  const student = await studentService.findStudentForVerification({
    name: studentName,
    fatherName,
    admissionNumber,
  });

  if (!student) {
    throw new ApiError(404, "No matching student record found");
  }

  res.json({ success: true, data: { studentId: student.id, studentName: student.name } });
}

module.exports = { createOrder, verifyPayment, listFees, getCaptcha, verifyStudent };
