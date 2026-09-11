const crypto = require("crypto");
const { pool } = require("./../config/db");
const razorpay = require("./razorpay.service");

// Attach a Razorpay order to an EXISTING pre-generated monthly fee row
// (created earlier when Principal set the class fee), instead of inserting a new row.
async function createFeeOrder(feeId, studentId) {
  const feeCheck = await pool.query(
    `SELECT * FROM fees WHERE id = $1 AND student_id = $2`,
    [feeId, studentId]
  );
  const fee = feeCheck.rows[0];
  if (!fee) {
    throw new Error("Fee record not found");
  }
  if (fee.status === "paid") {
    throw new Error("This fee is already paid");
  }

  const order = await razorpay.orders.create({
    amount: Math.round(Number(fee.amount) * 100),
    currency: "INR",
    receipt: `fee_${feeId}_${Date.now()}`,
  });

  const result = await pool.query(
    `UPDATE fees SET razorpay_order_id = $1, status = 'pending', updated_at = NOW()
     WHERE id = $2 RETURNING *`,
    [order.id, feeId]
  );

  return { order, fee: result.rows[0] };
}

async function verifyAndMarkPaid({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    throw new Error("Invalid payment signature");
  }

  const result = await pool.query(
    `UPDATE fees SET status = 'paid', payment_mode = 'online', razorpay_payment_id = $1, paid_at = NOW(), updated_at = NOW()
     WHERE razorpay_order_id = $2 RETURNING *`,
    [razorpay_payment_id, razorpay_order_id]
  );

  const fee = result.rows[0];
  if (!fee) return null;

  // Email ke liye student + class + admission_number chahiye, isliye
  // joined detail wapas bhejte hain instead of plain fees row.
  return getFeeWithDetails(fee.id);
}

async function getFeeByOrderId(orderId) {
  const { rows } = await pool.query(`SELECT * FROM fees WHERE razorpay_order_id = $1`, [orderId]);
  return rows[0] || null;
}

// fees + students + classes ko join karke ek hi row mein sab email-friendly
// detail deta hai (student name, admission number, class). Success aur
// failure dono email flows isi ko use karte hain.
async function getFeeWithDetails(feeId) {
  const { rows } = await pool.query(
    `SELECT f.*, s.name AS student_name, s.admission_number,
            c.name AS class_name, c.section AS class_section
     FROM fees f
     JOIN students s ON s.id = f.student_id
     JOIN classes c ON c.id = s.class_id
     WHERE f.id = $1`,
    [feeId]
  );
  return rows[0] || null;
}

async function getFeesByStudent(studentId) {
  const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  const result = await pool.query(
    `SELECT * FROM fees WHERE student_id = $1 AND fee_month IS NOT NULL AND fee_month <= $2 ORDER BY fee_month ASC`,
    [studentId, currentMonth]
  );
  return result.rows;
}

module.exports = { createFeeOrder, verifyAndMarkPaid, getFeeByOrderId, getFeeWithDetails, getFeesByStudent };
