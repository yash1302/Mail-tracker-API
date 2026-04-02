import express from "express";
import { responseHandler } from "../../common/messageHandlers.js";
import { followUpRoutesConstants } from "../../constants/routes.constants.js";
import { checkRepliesController } from "../controllers/followup.controller.js";
const { CHECK_REPLIES, GET_FOLLOWUPS } = followUpRoutesConstants;

const followUpRoutes = express.Router();

followUpRoutes.post(CHECK_REPLIES, async (req, res, next) => {
  try {
    const { userId, gmailAccountId, email } = req?.body || {};
    const result = await checkRepliesController(userId, gmailAccountId, email);
    res.status(200).json(new responseHandler(result));
  } catch (error) {
    next(error);
  }
});

followUpRoutes.get(GET_FOLLOWUPS, async (req, res, next) => {
  try {
    const { userId } = req?.query || {};
    const result = await getFollowUpsController(userId);
    res.status(200).json(new responseHandler(result));
  } catch (error) {
    next(error);
  }
});

export default followUpRoutes;
