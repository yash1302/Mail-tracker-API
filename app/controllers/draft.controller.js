import { stripHtml } from "../../common/utils.js";
import { draftMessages } from "../messages/draft.messages.js";
import {
  createDraftService,
  findDraftByIdService,
  getAllDraftsService,
  updateDraftService,
} from "../services/draft.services.js";
import utils from "../../common/utils.js";

const { uploadFilesToCloudinary } = utils;

const { DRAFTCREATED, DRAFTNOTFOUND, DRAFTDELETED } = draftMessages;

export const createDraftController = async (files, body) => {
  try {
    const attachmentsMeta = await uploadFilesToCloudinary(files);
    body.attachmentsMeta = attachmentsMeta;

    // 🔥 2. Process body
    const html = body.body || "";
    const text = stripHtml(html);

    body.html = html;
    body.text = text;
    const result = await createDraftService(body);

    return result;
  } catch (error) {
    console.error("Create Draft Error:", error);
    next(error);
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
      htmlBody: draft.html_Body,
      textBody: draft.text_body,
      bodyPreview: draft.body_preview,
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

    const html = body.body ?? existingDraft.html_Body;
    const text = stripHtml(html);

    const updatedDraft = await updateDraftService(id, {
      draftTitle: body.title ?? existingDraft.draftTitle,
      subject: body.subject ?? existingDraft.subject,
      html_Body: html,
      text_body: text,
      body_preview: text.slice(0, 200),
      attachmentsMeta: finalAttachments,
      updatedAt: new Date(),
    });

    return updatedDraft;
  } catch (error) {
    console.error("Update Draft Error:", error);
    throw error;
  }
};
