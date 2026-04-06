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

    const gmailAccount = await GmailAccount.findOne({ userId: user._id });

    const accessToken = await generateJwtToken({
      id: user.id,
      email: user.email,
      name: user.name,
      gmailAccountId: gmailAccount ? gmailAccount._id : null,
    });

    return accessToken;
  } catch (error) {
    throw error;
  }
};
