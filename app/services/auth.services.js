import { generateOTP } from "../../common/utils.js";
import { sendOTPEmail } from "../config/nodeMailer.js";
import OTPModel from "../models/otp.model.js";
import { logInfo } from "./logs.services.js";

export const sendOtpService = async (email) => {
  try {
    const otp = generateOTP();
    logInfo(`Generated OTP for ${email}: ${otp}`);
    await OTPModel.findOneAndUpdate(
      { email },
      {
        otp,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        attempts: 0,
      },
      { upsert: true },
    );

    await sendOTPEmail(email, otp);
  } catch (error) {
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
