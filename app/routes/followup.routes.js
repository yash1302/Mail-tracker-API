import express from "express";
import { responseHandler } from "../../common/messageHandlers.js";
import { followUpRoutesConstants } from "../../constants/routes.constants.js";
import {
  checkRepliesController,
  getFollowUpsController,
  updateFollowUpStatusController,
} from "../controllers/followup.controller.js";
import { authenticateJwtToken } from "../../middleware/authentication.middleware.js";
const { CHECK_REPLIES, GET_FOLLOWUPS, UPDATE_FOLLOWUP_STATUS } =
  followUpRoutesConstants;

const followUpRoutes = express.Router();

followUpRoutes.post(CHECK_REPLIES,authenticateJwtToken, async (req, res, next) => {
  try {
    const { userId, gmailAccountId } = req?.body || {};
    const result = await checkRepliesController(userId, gmailAccountId);
    res.status(200).json(new responseHandler(result));
  } catch (error) {
    next(error);
  }
});

followUpRoutes.get(GET_FOLLOWUPS, authenticateJwtToken, async (req, res, next) => {
  try {
    const { userId, gmailAccountId } = req?.query || {};
    const result = await getFollowUpsController(userId, gmailAccountId);
    res.status(200).json(new responseHandler(result));
  } catch (error) {
    next(error);
  }
});

followUpRoutes.patch(UPDATE_FOLLOWUP_STATUS, authenticateJwtToken, async (req, res, next) => {
  try {
    const { followUpId } = req.params;
    const { action } = req.body;
    const result = await updateFollowUpStatusController(followUpId, action);
    res.status(200).json(new responseHandler(result));
  } catch (error) {
    next(error);
  }
});

export default followUpRoutes;
