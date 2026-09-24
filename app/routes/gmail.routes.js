import express from "express";
import {
  connectGmail,
  deleteGmailAccountController,
  downloadAttachmentController,
  getDashboardKPIController,
  getEmailsController,
  getGmailAccountsController,
  oauthCallback,
  sendEmailController,
  trackClickController,
} from "../controllers/gmail.controller.js";
import { gmailRoutesConstants } from "../../constants/routes.constants.js";
import { responseHandler } from "../../common/messageHandlers.js";
import upload from "../middleware/multer.js";
import { authenticateJwtToken } from "../../middleware/authentication.middleware.js";

const {
  CONNECT,
  OAUTH2CALLBACK,
  GMAIL_ACCOUNT,
  SEND_EMAIL,
  CLICK_LINK_TRACKING,
  GET_EMAILS,
  DOWNLOAD_ATTACHMENT,
  DASHBOARD_KPI,
} = gmailRoutesConstants;

const gmailRoutes = express.Router();

gmailRoutes.get(CONNECT, connectGmail);

gmailRoutes.get(OAUTH2CALLBACK, oauthCallback);

gmailRoutes.get(GMAIL_ACCOUNT, authenticateJwtToken, async (req, res, next) => {
  try {
    const { id } = res.locals;
    const result = await getGmailAccountsController(id);
    res.status(200).json(new responseHandler(result));
  } catch (error) {
    next(error);
  }
});

gmailRoutes.delete(
  GMAIL_ACCOUNT,
  authenticateJwtToken,
  async (req, res, next) => {
    try {
      const { gmailAccountId } = req?.body;
      const result = await deleteGmailAccountController(gmailAccountId);
      res.status(200).json(new responseHandler(result));
    } catch (error) {
      next(error);
    }
  },
);

gmailRoutes.post(
  SEND_EMAIL,
  authenticateJwtToken,
  upload.array("files"),
  async (req, res, next) => {
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
        draftId,
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
        draftId,
      );
      res.status(200).json(new responseHandler(result));
    } catch (error) {
      next(error);
    }
  },
);

gmailRoutes.get(CLICK_LINK_TRACKING, trackClickController);

gmailRoutes.get(GET_EMAILS, authenticateJwtToken, async (req, res, next) => {
  try {
    const { gmailAccountId, userId } = req.query;
    const emails = await getEmailsController(userId, gmailAccountId);
    res.status(200).json(new responseHandler(emails));
  } catch (error) {
    next(error);
  }
});

gmailRoutes.get(
  DOWNLOAD_ATTACHMENT,
  authenticateJwtToken,
  downloadAttachmentController,
);

gmailRoutes.get(DASHBOARD_KPI, authenticateJwtToken, async (req, res, next) => {
  try {
    const { userId, gmailAccountId, filter } = req.query;
    const kpiData = await getDashboardKPIController(
      userId,
      gmailAccountId,
      filter,
    );
    res.status(200).json(new responseHandler(kpiData));
  } catch (error) {
    next(error);
  }
});

export default gmailRoutes;
