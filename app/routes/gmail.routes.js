import express from "express";
import {
  connectGmail,
  deleteGmailAccountController,
  getGmailAccountsController,
  oauthCallback,
} from "../controllers/gmail.controller.js";
import { gmailRoutesConstants } from "../../constants/routes.constants.js";
import { responseHandler } from "../../common/messageHandlers.js";

const { CONNECT, OAUTH2CALLBACK, GMAIL_ACCOUNT } = gmailRoutesConstants;

const gmailRoutes = express.Router();

gmailRoutes.get(CONNECT, connectGmail);

gmailRoutes.get(OAUTH2CALLBACK, oauthCallback);

gmailRoutes.get(GMAIL_ACCOUNT, async (req, res, next) => {
  try {
    const result = await getGmailAccountsController();
    res.status(200).json(new responseHandler(result));
  } catch (error) {
    next(error);
  }
});

gmailRoutes.delete(GMAIL_ACCOUNT, async (req, res, next) => {
  try {
    const { email, userId } = req?.body;
    const result = await deleteGmailAccountController(email, userId);
    res.status(200).json(new responseHandler(result));
  } catch (error) {
    next(error);
  }
});

export default gmailRoutes;
