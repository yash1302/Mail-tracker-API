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
