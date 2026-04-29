import dotenv from "dotenv";
dotenv.config();
import nodemailer from "nodemailer";
import { logInfo } from "../../common/logger.js";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendOTPEmail = (email, otp) => {
  logInfo(`Preparing to send OTP email to ${email}`);
  const result = transporter.sendMail({
    from: process.env.EMAIL,
    to: email,
    subject: "OTP Verification",
    html: `<p>Your OTP is <b>${otp}</b></p>`,
  });
  logInfo(`OTP email sent successfully to ${email}`);
  return result;
};
