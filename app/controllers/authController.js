import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import {
  createUserService,
  findUserByEmailService,
} from "../services/user.services.js";
import utils from "../../common/utils.js";
import { authMessages } from "../messages/auth.messages.js";
import GmailAccount from "../models/gmailAccountsModels.js";
import { sendOtpService, verifyOtpService } from "../services/auth.services.js";
import { logError, logInfo } from "../services/logs.services.js";
const { USERPRESENT, LOGINFAILURE, UNAUTHORIZED } = authMessages;

const { hashPassword, generateJwtToken, verifyPassword } = utils;
dotenv.config();

export const signup = async (name, email, password) => {
  try {
    const existingUser = await findUserByEmailService(email);

    if (existingUser) {
      throw USERPRESENT;
    }

    const hashedPassword = await hashPassword(password);

    const user = await createUserService({
      name,
      email,
      password: hashedPassword,
    });

    const accessToken = await generateJwtToken({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    return accessToken;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const login = async (email, password) => {
  try {
    const user = await findUserByEmailService(email);

    if (!user) {
      throw LOGINFAILURE;
    }

    const isMatch = await verifyPassword(password, user.password);

    if (!isMatch) {
      throw UNAUTHORIZED;
    }

    const accessToken = await generateJwtToken({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    return accessToken;
  } catch (error) {
    throw error;
  }
};

export const sendOtp = async (email) => {
  try {
    const result = await sendOtpService(email);
    logInfo(
      `OTP sent to ${email} from auth controller with result ${result.message}`,
    );
    return { message: "OTP sent successfully" };
  } catch (error) {
    throw error;
  }
};

export const verifyOtp = async (email, otp) => {
  try {
    await logInfo(`Verifying OTP for ${email}`);
    await verifyOtpService(email, otp);

    return { message: "OTP verified" };
  } catch (error) {
    await logError(`OTP verification failed for ${email}: ${error.message}`);
    throw error;
  }
};
