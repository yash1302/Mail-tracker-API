import { generateOTP } from "../../common/utils.js";
import { sendOTPEmail } from "../config/nodeMailer.js";
import OTPModel from "../models/otp.model.js";
import { logError, logInfo } from "./logs.services.js";

export const sendOtpService = async (email) => {
  try {
    const otp = generateOTP();
    await logInfo(`Generated OTP for ${email}: ${otp}`);
    await OTPModel.findOneAndUpdate(
      { email },
      {
        otp,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        attempts: 0,
      },
      { upsert: true },
    );

    const result = await sendOTPEmail(email, otp);
    await logInfo(
      `logs from sendOtpService : OTP email sent successfully to ${email} with response ${result.response}`,
    );
    return result;
  } catch (error) {
    await logError(`Error in sendOtpService for ${email}: ${error.message}`);
    throw error;
  }
};

export const verifyOtpService = async (email, otp) => {
  try {
    const record = await OTPModel.findOne({ email });

    if (!record) throw new Error("OTP not found");

    if (record.expiresAt < new Date()) {
      throw new Error("OTP expired");
    }

    if (record.otp !== otp) {
      record.attempts += 1;
      await record.save();
      throw new Error("Invalid OTP");
    }

    await OTPModel.deleteOne({ email });
  } catch (error) {
    throw error;
  }
};
