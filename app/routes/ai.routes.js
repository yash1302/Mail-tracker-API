import {
  aiRoutesConstants,
  routesConstants,
} from "../../constants/routes.constants.js";
import express from "express";
import { generateAIReply } from "../controllers/aiReply.controller.js";
import { responseHandler } from "../../common/messageHandlers.js";

const aiRouter = express.Router();

aiRouter.post(aiRoutesConstants.GENERATE_REPLY, async (req, res, next) => {
  try {
    const { threadId, tone } = req.body;
    const result = await generateAIReply( threadId, tone );
    res.status(201).json(new responseHandler(result));
  } catch (error) {
    next(error);
  }
});

export default aiRouter;
