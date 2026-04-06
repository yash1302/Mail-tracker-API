import GmailAccount from "../models/gmailAccountsModels.js";
import trackedEmailModel from "../models/trackedEmail.model.js";

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

export const getGmailAccountByIdService = async (gmailAccountId, userId) => {
  return GmailAccount.findOne({
    _id: gmailAccountId,
    userId,
  });
};

export const createTrackedEmailService = async (data) => {
  try {
    return await trackedEmailModel.create(data);
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const getTrackedEmailsService = async ({ userId, gmailAccountId }) => {
  try {
    return trackedEmailModel
      .find({ userId, gmailAccountId })
      .sort({ sentAt: -1 });
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const incrementClickCountService = async (trackingId) => {
  return trackedEmailModel.findOneAndReplace(
    { trackingId },
    {
      $inc: { clicksCount: 1 },
      $set: { lastActivityAt: new Date(), lastClickedAt: new Date() },
    },
    { new: true },
  );
};

export const getClickStatsService = async (trackingId) => {
  try {
    const email = await trackedEmailModel.findOne({ trackingId });

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
    const emails = await trackedEmailModel.find({
      userId,
      gmailAccountId,
      isReplied: false,
      status: "SENT",
    });
    return emails;
  } catch (error) {
    console.error("Check Replies Service Error:", error);
    throw error;
  }
};

export const updateTrackedEmailService = async (emailId) => {
  try {
    const updatedEmail = await trackedEmailModel.updateOne(
      { _id: emailId },
      { isReplied: true },
    );
    return updatedEmail;
  } catch (error) {
    console.error(error);
    throw error;
  }
};
