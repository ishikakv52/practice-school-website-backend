const feeService = require("../services/fee.service");

async function createOrder(req, res) {
  try {
    const { studentId, amount, description } = req.body;
    if (!studentId || !amount) {
      return res.status(400).json({ error: "studentId and amount are required" });
    }
    const { order, fee } = await feeService.createFeeOrder(studentId, amount, description);
    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      feeId: fee.id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create order" });
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

module.exports = { createOrder, verifyPayment, listFees };
