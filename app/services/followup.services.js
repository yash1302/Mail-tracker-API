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

export const getFollowUpsService = async (userId, gmailAccountId) => {
  try {
    const now = new Date();

    const followups = await followupModel
      .find({
        userId,
        gmailAccountId,
        isActive: true,
        status: "Pending",
        followUpCount: { $lt: 3 },
        nextFollowUpDate: { $lte: now },
      })
      .populate("emailId");

    return followups
      .filter((f) => f.emailId && !f.emailId.isReplied)
      .map((f) => {
        const sentAt = new Date(f.emailId.sentAt);
        const now = new Date();

        const daysSince = Math.floor(
          (now.getTime() - sentAt.getTime()) / (1000 * 60 * 60 * 24),
        );

        return {
          followUpId: f._id,
          emailId: f.emailId._id,
          to: f.emailId.to,
          cc: f.emailId.cc,
          bcc: f.emailId.bcc,
          subject: f.emailId.subject,
          htmlBody: f.emailId.htmlBody,
          opens: f.emailId.opensCount,
          sentAt: f.emailId.sentAt,
          daysSince,
          followUpCount: f.followUpCount,
          nextFollowUpDate: f.nextFollowUpDate,
          status: f.status,
          threadId: f.threadId,
        };
      });
  } catch (error) {
    throw error;
  }
};
