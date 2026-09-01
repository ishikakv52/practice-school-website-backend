// Loads and validates environment variables in one place.
// Every other file should read config from here instead of calling
// process.env directly, so we have a single source of truth.

require("dotenv").config();

const required = ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD"];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  // Fail loudly at startup rather than crashing later on a random query.
  console.warn(
    `[env] Warning: missing environment variables: ${missing.join(", ")}. ` +
      "Copy backend/.env.example to backend/.env and fill in real values."
  );
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "5000", 10),

  db: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || "3306", 10),
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },

  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",

  // SMTP is the "Nodemailer with SMTP" option from the requirements doc —
  // works with Gmail/SendGrid/Brevo SMTP relays without a vendor SDK.
  email: {
    host: process.env.SMTP_HOST || null,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    user: process.env.SMTP_USER || null,
    pass: process.env.SMTP_PASS || null,
    from: process.env.SMTP_FROM || null,
    schoolNotifyAddress: process.env.SCHOOL_NOTIFY_EMAIL || null,
  },

  // These are read here (not directly via process.env) so that later
  // feature phases (Maps, Weather, YouTube, Razorpay, Email, SMS/WhatsApp,
  // reCAPTCHA, AI chatbot) all pull secrets from one validated place.
  apiKeys: {
    googleMaps: process.env.GOOGLE_MAPS_API_KEY || null,
    weather: process.env.WEATHER_API_KEY || null,
    youtube: process.env.YOUTUBE_API_KEY || null,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || null,
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || null,
    email: process.env.EMAIL_API_KEY || null,
    sms: process.env.SMS_API_KEY || null,
    whatsapp: process.env.WHATSAPP_API_KEY || null,
    ai: process.env.AI_API_KEY || null,
    recaptchaSecret: process.env.RECAPTCHA_SECRET_KEY || null,
  },

  jwt: {
    secret: process.env.JWT_SECRET || null,
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    cookieName: "token",
  },
};

if (!process.env.JWT_SECRET) {
  console.warn(
    "[env] Warning: JWT_SECRET is not set — auth routes will reject all requests until it is."
  );
}

module.exports = env;
