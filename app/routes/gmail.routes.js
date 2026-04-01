import express from "express";
import {
  connectGmail,
  deleteGmailAccountController,
  downloadAttachmentController,
  getClickStatsController,
  getEmailsController,
  getGmailAccountsController,
  oauthCallback,
  sendEmailController,
  trackClickController,
} from "../controllers/gmail.controller.js";
import { gmailRoutesConstants } from "../../constants/routes.constants.js";
import { responseHandler } from "../../common/messageHandlers.js";
import upload from "../middleware/multer.js";

const {
  CONNECT,
  OAUTH2CALLBACK,
  GMAIL_ACCOUNT,
  SEND_EMAIL,
  OPEN_EMAIL_TRACKING,
  CLICK_LINK_TRACKING,
  GET_EMAILS,
  GET_CLICK_STATS,
  DOWNLOAD_ATTACHMENT,
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

gmailRoutes.post(SEND_EMAIL, upload.array("files"), async (req, res, next) => {
  try {
    const {
      to,
      cc,
      bcc,
      subject,
      body,
      gmailAccountId,
      userId,
      attachmentIds = [],
    } = req?.body;
    const files = req?.files || [];
    const result = await sendEmailController(
      JSON.parse(to),
      JSON.parse(cc),
      JSON.parse(bcc),
      subject,
      body,
      gmailAccountId,
      userId,
      JSON.parse(attachmentIds),
      files,
    );
    res.status(200).json(new responseHandler(result));
  } catch (error) {
    next(error);
  }
});

gmailRoutes.get(CLICK_LINK_TRACKING, trackClickController);

gmailRoutes.get(GET_EMAILS, async (req, res, next) => {
  try {
    const { gmailAccountId, userId } = req.query;
    const emails = await getEmailsController(userId, gmailAccountId);
    res.status(200).json(new responseHandler(emails));
  } catch (error) {
    next(error);
  }
});

gmailRoutes.get(GET_CLICK_STATS, async (req, res, next) => {
  try {
    const { trackingId } = req.params;
    const stats = await getClickStatsController(trackingId);
    res.status(200).json(new responseHandler(stats));
  } catch (error) {
    next(error);
  }
});

gmailRoutes.get(DOWNLOAD_ATTACHMENT, downloadAttachmentController);

export default gmailRoutes;
