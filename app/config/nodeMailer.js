import dotenv from "dotenv";
dotenv.config();
import { logError, logInfo } from "../services/logs.services.js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendOTPEmail = async (email, otp) => {
  try {
    await logInfo(`Sending OTP email to ${email}`);

    const result = await resend.emails.send({
      from: process.env.EMAIL, // or your custom domain
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
