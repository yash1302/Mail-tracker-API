import express from "express";
import {
  checkEmailReadStatus,
  connectGmail,
  deleteGmailAccountController,
  getGmailAccountsController,
  oauthCallback,
  sendEmailController,
} from "../controllers/gmail.controller.js";
import { gmailRoutesConstants } from "../../constants/routes.constants.js";
import { responseHandler } from "../../common/messageHandlers.js";

const {
  CONNECT,
  OAUTH2CALLBACK,
  GMAIL_ACCOUNT,
  SEND_EMAIL,
  OPEN_EMAIL_TRACKING,
} = gmailRoutesConstants;

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

gmailRoutes.post(SEND_EMAIL, async (req, res, next) => {
  try {
    const { to, cc, bcc, subject, html, gmailAccountId, userId } = req?.body;
    const result = await sendEmailController(
      to,
      cc,
      bcc,
      subject,
      html,
      gmailAccountId,
      userId,
    );
    res.status(200).json(new responseHandler(result));
  } catch (error) {
    next(error);
  }
});

gmailRoutes.get(OPEN_EMAIL_TRACKING, async (req, res, next) => {
  try {
    const { trackingId } = req.params;

    console.log("Email Opened:", trackingId);

    // TODO: update DB here (opensCount++)

    // ✅ return transparent pixel
    const img = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=",
      "base64",
    );

    res.set("Content-Type", "image/png");
    res.set("Content-Length", img.length);

    res.status(200).end(img);
  } catch (error) {
    next(error);
  }
});

gmailRoutes.get("/test", async (req, res, next) => {
  try {
    checkEmailReadStatus(
      "69c2166bb29ad119060305e1",
      "69be282f308e28bd2f3c6997",
      "19d1ec82908445e8",
    );
    res.status(200).json(new responseHandler("Test route working"));
  } catch (error) {
    next(error);
  }
});

export default gmailRoutes;
