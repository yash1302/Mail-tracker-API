import express from "express";
import { draftRoutesConstants } from "../../constants/routes.constants.js";
import {
  createDraftController,
  deleteDraftController,
  getAllDraftsController,
  updateDraftController,
} from "../controllers/draft.controller.js";
import { responseHandler } from "../../common/messageHandlers.js";
import upload from "../middleware/multer.js";
import { authenticateJwtToken } from "../../middleware/authentication.middleware.js";

const draftRoutes = express.Router();
const { GET_DRAFTS, CREATE_DRAFT, UPDATE_DRAFT, DELETE_DRAFT } =
  draftRoutesConstants;

draftRoutes.post(
  CREATE_DRAFT,
  authenticateJwtToken,
  upload.array("files"),
  async (req, res, next) => {
    try {
      const files = req?.files || [];
      const body = req?.body || {};
      const result = await createDraftController(files, body);
      res.status(200).json(new responseHandler(result));
    } catch (error) {
      next(error);
    }
  },
);

draftRoutes.get(GET_DRAFTS, authenticateJwtToken, async (req, res, next) => {
  try {
    const { userId, gmailAccountId } = req?.query || {};

    const result = await getAllDraftsController(userId, gmailAccountId);
    res.status(200).json(new responseHandler(result));
  } catch (error) {
    next(error);
  }
});

draftRoutes.put(UPDATE_DRAFT, authenticateJwtToken, upload.array("files"), async (req, res, next) => {
  try {
    const { id } = req.query;
    const body = req.body;
    const files = req.files || [];
    const result = await updateDraftController(id, body, files);
    res.status(200).json(new responseHandler(result));
  } catch (error) {
    next(error);
  }
});

draftRoutes.delete(DELETE_DRAFT, authenticateJwtToken, async (req, res, next) => {
  try {
    const { id } = req.query;
    const result = await deleteDraftController(id);
    res.status(200).json(new responseHandler(result));
  } catch (error) {
    next(error);
  }
});

export default draftRoutes;
