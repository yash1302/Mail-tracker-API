import DraftModel from "../models/draftModels.js";

export const createDraftService = async (data) => {
  try {
    const {
      userId,
      gmailAccountId,
      subject,
      title,
      attachmentsMeta,
      html,
      text,
    } = data;

    const draft = await DraftModel.create({
      userId,
      gmailAccountId,
      subject,
      html_Body: html,
      text_body: text,
      body_preview: text.slice(0, 200),
      draftTitle: title,
      attachmentsMeta,
    });

    return draft;
  } catch (error) {
    throw error;
  }
};

export const getAllDraftsService = async (userId, gmailAccountId) => {
  try {
    const query = {
      userId,
      gmailAccountId,
    };

    const drafts = await DraftModel.find(query).sort({ updatedAt: -1 }).lean();

    return drafts;
  } catch (error) {
    throw error;
  }
};

export const updateDraftService = async (draftId, updateData) => {
  try {
    const updatedDraft = await DraftModel.findByIdAndUpdate(
      draftId,
      {
        ...updateData,
        updatedAt: new Date(),
      },
      { new: true },
    );

    return updatedDraft;
  } catch (error) {
    throw error;
  }
};

export const findDraftByIdService = async (draftId) => {
  try {
    const draft = await DraftModel.findById(draftId);
    return draft;
  } catch (error) {
    throw error;
  }
};

export const deleteDraftService = async (draftId) => {
  try {
    await DraftModel.findByIdAndDelete(draftId);
    return { message: "Draft deleted successfully" };
  } catch (error) {
    throw error;
  }
};