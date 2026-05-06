import { stripHtml } from "../../common/utils.js";
import { draftMessages } from "../messages/draft.messages.js";
import {
  createDraftService,
  deleteDraftService,
  findDraftByIdService,
  getAllDraftsService,
  updateDraftService,
} from "../services/draft.services.js";
import utils from "../../common/utils.js";

const { uploadFilesToCloudinary } = utils;

const { DRAFTDELETED } = draftMessages;

export const createDraftController = async (files, body) => {
  try {
    const attachmentsMeta = await uploadFilesToCloudinary(files);

    const html = body.body || "";
    const text = stripHtml(html);

    const result = await createDraftService({
      userId: body.userId,
      gmailAccountId: body.gmailAccountId,
      subject: body.subject,
      htmlBody: html,
      textBody: text,
      bodyPreview: text.slice(0, 200),
      draftTitle: body.title,
      attachmentsMeta,
    });

    return result;
  } catch (error) {
    console.error("Create Draft Error:", error);
    throw error;
  }
};

export const getAllDraftsController = async (userId, gmailAccountId) => {
  try {
    if (!userId || !gmailAccountId) {
      throw new Error("userId and gmailAccountId are required");
    }

    const drafts = await getAllDraftsService(userId, gmailAccountId);

    const formattedDrafts = drafts.map((draft) => ({
      id: draft._id,
      title: draft.draftTitle,
      subject: draft.subject,
      htmlBody: draft.htmlBody,
      textBody: draft.textBody,
      bodyPreview: draft.bodyPreview,
      attachments: draft.attachmentsMeta || [],
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
    }));

    return formattedDrafts;
  } catch (error) {
    console.error("Get Drafts Error:", error);
    throw error;
  }
};

export const updateDraftController = async (id, body, files) => {
  try {
    const existingDraft = await findDraftByIdService(id);

    if (!existingDraft) {
      throw new Error("Draft not found");
    }

    let existingIds = [];

    if (body.existingAttachments) {
      try {
        existingIds = JSON.parse(body.existingAttachments).map((a) => a._id);
      } catch {
        existingIds = [];
      }
    }

    const keptAttachments = (existingDraft.attachmentsMeta || []).filter(
      (file) => existingIds.includes(file._id.toString()),
    );

    const newAttachments = files?.length
      ? await uploadFilesToCloudinary(files)
      : [];

    const finalAttachments = [...keptAttachments, ...newAttachments];

    const html = body.body ?? existingDraft.htmlBody;
    const text = stripHtml(html);

    const updatedDraft = await updateDraftService(id, {
      draftTitle: body.title ?? existingDraft.draftTitle,
      subject: body.subject ?? existingDraft.subject,
      htmlBody: html,
      textBody: text,
      bodyPreview: text.slice(0, 200),
      attachmentsMeta: finalAttachments,
      updatedAt: new Date(),
    });

    return updatedDraft;
  } catch (error) {
    console.error("Update Draft Error:", error);
    throw error;
  }
};

export const deleteDraftController = async (id) => {
  try {
    const existingDraft = await findDraftByIdService(id);

    if (!existingDraft) {
      throw new Error("Draft not found");
    }

    await deleteDraftService(id);
    return { message: DRAFTDELETED };
  } catch (error) {
    console.error("Delete Draft Error:", error);
    throw error;
  }
};
