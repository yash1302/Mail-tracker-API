import express from "express";
import {
  signup,
  login,
  sendOtp,
  verifyOtp,
} from "../controllers/authController.js";
import { authRoutesConstants } from "../../constants/routes.constants.js";
import { responseHandler } from "../../common/messageHandlers.js";
import { logInfo } from "../services/logs.services.js";

const authRouter = express.Router();
const { SIGNUP, LOGIN, SEND_OTP, VERIFY_OTP } = authRoutesConstants;
authRouter.post(SIGNUP, async (req, res, next) => {
  try {
    const { name, email, password } = req?.body;
    const result = await signup(name, email, password);
    res.status(201).json(new responseHandler(result));
  } catch (error) {
    next(error);
  }
});
authRouter.post(LOGIN, async (req, res, next) => {
  try {
    const { email, password } = req?.body;
    const result = await login(email, password);
    res.status(200).json(new responseHandler(result));
  } catch (error) {
    next(error);
  }
});

authRouter.post(SEND_OTP, async (req, res, next) => {
  try {
    const { email } = req?.body;
    const result = await sendOtp(email);
    logInfo(`OTP sent to ${email} from auth route`);
    res.status(200).json(new responseHandler(result));
  } catch (error) {
    next(error);
  }
});

authRouter.post(VERIFY_OTP, async (req, res, next) => {
  try {
    const { email, otp } = req?.body;
    await verifyOtp(email, otp);
    res.status(200).json(new responseHandler("OTP verified successfully"));
  } catch (error) {
    next(error);
  }
});
export default authRouter;
