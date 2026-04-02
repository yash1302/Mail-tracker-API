import followupModel from "../models/followup.model.js";

export const createFollowUpService = async (followUpData) => {
  try {
    const followUp = new followupModel(followUpData);
    return await followUp.save();
  } catch (error) {
    throw error;
  }
};

export const updateFollowUpService = async (threadId) => {
  try {
    return await followupModel.updateMany(
      { threadId },
      {
        status: "Completed",
        isActive: false,
      },
    );
  } catch (error) {
    throw error;
  }
};

export const getFollowUpsService = async (userId) => {
  try {
    const now = new Date();

    const followups = await followupModel
      .find({
        isActive: true,
        status: "Pending",
        followUpCount: { $lt: 3 },
        nextFollowUpDate: { $lte: now },
      })
      .populate("emailId");

    return followups
      .filter((f) => f.emailId && !f.emailId.isReplied)
      .map((f) => ({
        followUpId: f._id,
        emailId: f.emailId._id,
        to: f.emailId.to,
        subject: f.emailId.subject,
        htmlBody: f.emailId.htmlBody,
        followUpCount: f.followUpCount,
        nextFollowUpDate: f.nextFollowUpDate,
        threadId: f.threadId,
      }));
  } catch (error) {
    throw error;
  }
};
