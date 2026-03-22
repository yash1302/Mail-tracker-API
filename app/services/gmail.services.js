import GmailAccount from "../models/gmailAccountsModels.js";

export const insertGmailAccountService = async (gmailAccountData) => {
  try {
    const newGmailAccount = new GmailAccount(gmailAccountData);
    await newGmailAccount.save();
    return newGmailAccount;
  } catch (error) {
    console.error(error);
    throw error;
  }
};
