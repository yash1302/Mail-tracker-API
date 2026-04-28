import followupModel from "../models/followup.model.js";
import messageModel from "../models/messageModel.js";

export const createFollowUpService = async ({
  threadId,
  userId,
  gmailAccountId,
}) => {
  const existing = await followupModel.findOne({ threadId, userId });
  if (existing) return existing;

  return followupModel.create({
    threadId,
    userId,
    gmailAccountId,
    followUpCount: 0,
    nextFollowUpDate:new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    status: "Pending",
    isActive: true,
  });
};

export const updateFollowUpService = async (threadId, userId) => {
  try {
    return await followupModel.updateMany(
      { threadId, userId },
      {
        status: "Completed",
        isActive: false,
        stoppedReason: "REPLIED",
      },
    );
  } catch (error) {
    console.error("Update FollowUp Error:", error);
    throw error;
  }
};

export const getFollowUpsService = async (userId, gmailAccountId) => {
  const now = new Date();

  const followups = await followupModel.find({
    userId,
    gmailAccountId,
    isActive: true,
    followUpCount: { $lt: 3 },
    nextFollowUpDate: { $lte: now },
  });

  const results = [];

  for (const f of followups) {
    const lastMessage = await messageModel
      .findOne({
        threadId: f.threadId,
        userId,
        gmailAccountId,
      })
      .sort({ sentAt: -1 });

    if (!lastMessage || lastMessage.isReplied) continue;

    const daysSince = Math.floor(
      (now - new Date(lastMessage.sentAt)) / (1000 * 60 * 60 * 24),
    );

    results.push({
      followUpId: f._id,
      threadId: f.threadId,

      to: lastMessage.to,
      cc: lastMessage.cc,
      bcc: lastMessage.bcc,

      subject: lastMessage.subject,
      htmlBody: lastMessage.htmlBody,

      opens: lastMessage.opensCount,
      sentAt: lastMessage.sentAt,
      messageId: lastMessage._id,

      daysSince,
      followUpCount: f.followUpCount,
      nextFollowUpDate: f.nextFollowUpDate,
      status: f.status,
    });
  }

  return results;
};
