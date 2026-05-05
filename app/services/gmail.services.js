import GmailAccount from "../models/gmailAccountsModels.js";
import threadModel from "../models/threadModel.js";
import MessageModel from "../models/messageModel.js";
import messageModel from "../models/messageModel.js";

export const insertGmailAccountService = async ({
  userId,
  email,
  accessToken,
  refreshToken,
  tokenExpiry,
  isPrimary,
}) => {
  try {
    const updatedAccount = await GmailAccount.findOneAndUpdate(
      { userId, email },
      {
        $set: {
          accessToken,
          refreshToken,
          tokenExpiry,
          ...(isPrimary !== undefined && { isPrimary }),
          isActive: true,
        },
      },
      {
        upsert: true,
        new: true,
      },
    );

    return updatedAccount;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const getGmailAccountsService = async (userId) => {
  try {
    const gmailAccounts = await GmailAccount.find({ userId, isActive: true });
    return gmailAccounts;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const getGmailAccountByEmailAndUserIdService = async (email, userId) => {
  try {
    const gmailAccount = await GmailAccount.findOne({ email, userId });
    return gmailAccount;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

// Instead of deleting the Gmail account record, we will mark it as inactive and clear sensitive data.
// This way we can keep a history of connected accounts without losing data permanently.
export const deleteGmailAccountService = async (gmailAccountId) => {
  try {
    const result = await GmailAccount.findOneAndUpdate(
      { _id: gmailAccountId },
      {
        $set: {
          isActive: false,
          accessToken: null,
          refreshToken: null,
          tokenExpiry: null,
          isPrimary: false,
        },
      },
      { new: true },
    );

    return result;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

// This service is used to fetch a specific Gmail account by its ID, ensuring it belongs to the user and is active.
// This is useful for operations that require validating the account before performing actions like sending emails or tracking.
export const getGmailAccountByIdService = async (gmailAccountId, userId) => {
  return GmailAccount.findOne({
    _id: gmailAccountId,
    userId,
  });
};

export const createTrackedEmailService = async (data) => {
  try {
    return await messageModel.create(data);
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const getTrackedEmailsService = async ({ userId, gmailAccountId }) => {
  try {
    const messages = await messageModel.find({ userId, gmailAccountId });

    // 🔥 SORT (latest first)
    messages.sort(
      (a, b) =>
        new Date(b.sentAt || b.receivedAt) - new Date(a.sentAt || a.receivedAt),
    );

    const threadMap = {};

    for (const msg of messages) {
      const activityTime = msg.sentAt || msg.receivedAt;

      if (!threadMap[msg.threadId]) {
        threadMap[msg.threadId] = {
          threadId: msg.threadId,
          subject: msg.subject,
          participants: new Set(),
          messages: [],
          lastActivityAt: activityTime,
          totalClicks: 0,
          isReplied: false,
          repliesCount: 0,
        };
      }

      // 🔥 normalize email (important)
      const normalizeEmail = (email) => email?.match(/<(.+)>/)?.[1] || email;

      msg.to?.forEach((p) =>
        threadMap[msg.threadId].participants.add(normalizeEmail(p)),
      );
      msg.cc?.forEach((p) =>
        threadMap[msg.threadId].participants.add(normalizeEmail(p)),
      );
      msg.bcc?.forEach((p) =>
        threadMap[msg.threadId].participants.add(normalizeEmail(p)),
      );
      if (msg.from)
        threadMap[msg.threadId].participants.add(normalizeEmail(msg.from));

      // push message
      threadMap[msg.threadId].messages.push({
        ...msg.toObject(),
        sentAt: activityTime,
      });

      // ✅ ONLY count incoming replies
      if (msg.type === "reply" && msg.direction === "incoming") {
        threadMap[msg.threadId].isReplied = true;
        threadMap[msg.threadId].repliesCount += 1;
      }

      // clicks
      threadMap[msg.threadId].totalClicks += Number(msg.clicksCount || 0);

      // last activity
      if (activityTime > threadMap[msg.threadId].lastActivityAt) {
        threadMap[msg.threadId].lastActivityAt = activityTime;
      }
    }

    const result = Object.values(threadMap).map((thread) => {
      thread.messages.sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));

      return {
        ...thread,
        participants: Array.from(thread.participants),
      };
    });

    return result;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

// This service helps to tracks nos of clicks on that email and when was last
// click happened.
export const incrementClickCountService = async (trackingId) => {
  try {
    return await messageModel.findOneAndUpdate(
      { trackingId },
      {
        $inc: { clicksCount: 1 },
        $set: {
          lastClickedAt: new Date(),
        },
      },
      { new: true },
    );
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const getClickStatsService = async (trackingId) => {
  try {
    const email = await messageModel.findOne({ trackingId });

    if (!email) {
      throw new Error("Tracking ID not found");
    }

    return {
      trackingId: email.trackingId,
      clicksCount: email.clicksCount || 0,
      opensCount: email.opensCount || 0,
      lastClickedAt: email.lastClickedAt || null,
      lastActivityAt: email.lastActivityAt || null,
    };
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const checkRepliesService = async (userId, gmailAccountId) => {
  try {
    const emails = await messageModel.find({
      userId,
      gmailAccountId,
      isReplied: false,
    });
    return emails;
  } catch (error) {
    console.error("Check Replies Service Error:", error);
    throw error;
  }
};

export const updateTrackedEmailService = async (threadId) => {
  try {
    return await messageModel.updateMany(
      { threadId, type: "initial" },
      { isReplied: true },
    );
  } catch (error) {
    console.error("Update Message Error:", error);
    throw error;
  }
};

export const createThreadService = async ({
  threadId,
  userId,
  gmailAccountId,
  subject,
  participants = [],
}) => {
  try {
    const now = new Date();

    return await threadModel.updateOne(
      { gmailThreadId: threadId, userId },
      {
        $setOnInsert: {
          userId,
          gmailAccountId,
          gmailThreadId: threadId,
          subject,
          createdAt: now,
        },
        $set: {
          lastMessageAt: now,
          lastActivityAt: now,
        },
        $addToSet: {
          participants: {
            $each: participants.filter(Boolean),
          },
        },
      },
      { upsert: true },
    );
  } catch (error) {
    console.error("Create Thread Error:", error);
    throw error;
  }
};

export const createMessageService = async (data) => {
  try {
    return await MessageModel.create(data);
  } catch (error) {
    console.error("Create Message Error:", error);
    throw error;
  }
};
