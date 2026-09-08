const { sendEmail } = require('../utils/mailer');

router.get('/test-email', async (req, res) => {
  try {
    await sendEmail({
      to: "ishikakv52@gmail.com", // apni email daalo test ke liye
      subject: "Test Email from NexaHub",
      html: "<p>Agar ye mila, matlab Brevo integration working hai!</p>"
    });
    res.json({ message: "Email sent successfully" });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Failed to send email" });
  }
});