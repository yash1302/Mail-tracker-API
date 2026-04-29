import dotenv from "dotenv";
dotenv.config();
import nodemailer from "nodemailer";
import { logError, logInfo } from "../services/logs.services.js";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS,
  },
  debug: true,
  logger: true,
});

export const sendOTPEmail = async (email, otp) => {
  try {
    await logInfo(`Sending OTP email to ${email}`);

    const result = await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: "OTP Verification",
      html: `<p>Your OTP is <b>${otp}</b></p>`,
    });

    await logInfo(`OTP email sent successfully to ${email}`);

    return result;
  } catch (error) {
    await logError(`Failed to send OTP email`, {
      email,
      error: error.message,
    });

    throw error;
  }
};
