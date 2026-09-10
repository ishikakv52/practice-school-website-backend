const svgCaptcha = require("svg-captcha");
const jwt = require("jsonwebtoken");
const env = require("../config/env");

const CAPTCHA_EXPIRY = "5m";

function generateCaptcha() {
  const captcha = svgCaptcha.create({
    size: 5,
    noise: 3,
    color: true,
    ignoreChars: "0oO1ilI",
  });

  const token = jwt.sign(
    { captchaText: captcha.text.toLowerCase() },
    env.jwt.secret,
    { expiresIn: CAPTCHA_EXPIRY }
  );

  return { svg: captcha.data, token };
}

function verifyCaptcha(token, userInput) {
  try {
    const decoded = jwt.verify(token, env.jwt.secret);
    return decoded.captchaText === String(userInput || "").toLowerCase();
  } catch {
    return false;
  }
}

module.exports = { generateCaptcha, verifyCaptcha };
