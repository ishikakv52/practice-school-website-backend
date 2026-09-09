const crypto = require("crypto");
const pool = require("../config/db");
const razorpay = require("./razorpay.service");

async function createFeeOrder(studentId, amount, description = "School Fee") {
  const order = await razorpay.orders.create({
    amount: Math.round(amount * 100),
    currency: "INR",
    receipt: `fee_${studentId}_${Date.now()}`,
  });

  const result = await pool.query(
    `INSERT INTO fees (student_id, amount, description, status, razorpay_order_id)
     VALUES ($1, $2, $3, 'pending', $4) RETURNING *`,
    [studentId, amount, description, order.id]
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
    `UPDATE fees SET status = 'paid', razorpay_payment_id = $1, paid_at = NOW(), updated_at = NOW()
     WHERE razorpay_order_id = $2 RETURNING *`,
    [razorpay_payment_id, razorpay_order_id]
  );

  return result.rows[0];
}

async function getFeesByStudent(studentId) {
  const result = await pool.query(
    `SELECT * FROM fees WHERE student_id = $1 ORDER BY created_at DESC`,
    [studentId]
  );
  return result.rows;
}

module.exports = { createFeeOrder, verifyAndMarkPaid, getFeesByStudent };
