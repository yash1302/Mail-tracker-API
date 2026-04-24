import DraftModel from "../models/draftModels.js";

export const createDraftService = async (data) => {
  try {
    const {
      userId,
      gmailAccountId,
      subject,
      draftTitle,
      attachmentsMeta,
      htmlBody,
      textBody,
      bodyPreview
    } = data;

    const draft = await DraftModel.create({
      userId,
      gmailAccountId,
      subject,
      htmlBody: htmlBody,
      textBody: textBody,
      bodyPreview: bodyPreview,
      draftTitle: draftTitle,
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
    return await DraftModel.findByIdAndUpdate(
      draftId,
      {
        ...updateData,
        updatedAt: new Date(),
      },
      { new: true },
    );
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

// This service is used to fetch metadata for specific attachments within a draft.
// It takes the draft ID and an array of attachment IDs, and returns the metadata for those attachments if they exist in the draft.
// This is useful for operations that need to access or manage attachments associated with a draft email.
export const getAttachmentsMetaByDraftIdService = async (
  draftId,
  attachmentIds,
) => {
  try {
    const draft = await DraftModel.findOne(
      { _id: draftId },
      {
        attachmentsMeta: {
          $elemMatch: { _id: { $in: attachmentIds } },
        },
      },
    );
    return draft ? draft.attachmentsMeta : [];
  } catch (error) {
    throw error;
  }
};
