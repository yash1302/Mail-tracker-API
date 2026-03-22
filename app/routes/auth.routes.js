import express from "express";
import { signup, login } from "../controllers/authController.js";
import { authRoutesConstants } from "../../constants/routes.constants.js";
import { responseHandler } from "../../common/messageHandlers.js";

const authRouter = express.Router();
const { SIGNUP, LOGIN } = authRoutesConstants;
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

export default authRouter;
