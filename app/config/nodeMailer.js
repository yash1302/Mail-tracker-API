import dotenv from "dotenv";
dotenv.config();
import nodemailer from "nodemailer";
import { logInfo } from "../services/logs.services.js";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS,
  },
  port: 465, // Critical for Render - use 465 instead of 587
  secure: true, // Use TLS
  connectionTimeout: 5000, // 5 second timeout
  socketTimeout: 5000,
});

export const sendOTPEmail = async (email, otp) => {
  logInfo(`Sending OTP email to ${email}`);
  const result = await transporter.sendMail({
    from: process.env.EMAIL,
    to: email,
    subject: "OTP Verification",
    html: `<p>Your OTP is <b>${otp}</b></p>`,
  });
  logInfo(`OTP email sent successfully to ${email}`);
  return result;
};
