const axios = require('axios');

async function sendEmail({ to, subject, html }) {
  await axios.post('https://api.brevo.com/v3/smtp/email', {
    sender: { name: "NexaHub School", email: "jaat00000026@gmail.com" },
    to: [{ email: to }],
    subject,
    htmlContent: html,
  }, {
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
    },
  });
}

module.exports = { sendEmail };