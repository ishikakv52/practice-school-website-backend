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

  return result.rows[0];
}

async function getFeesByStudent(studentId) {
  const result = await pool.query(
    `SELECT * FROM fees WHERE student_id = $1 AND fee_month IS NOT NULL ORDER BY fee_month ASC`,
    [studentId]
  );
  return result.rows;
}

module.exports = { createFeeOrder, verifyAndMarkPaid, getFeesByStudent };
