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

export const getGmailAccountsService = async () => {
  try {
    const gmailAccounts = await GmailAccount.find();
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

export const deleteGmailAccountService = async (email, userId) => {
  try {
    const result = await GmailAccount.deleteOne({ email, userId });
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
