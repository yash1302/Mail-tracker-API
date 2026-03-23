import { google } from "googleapis";
import { oauth2Client } from "../config/google.js";
import {
  deleteGmailAccountService,
  getGmailAccountByEmailAndUserIdService,
  getGmailAccountsService,
  insertGmailAccountService,
} from "../services/gmail.services.js";
import utils from "../../common/utils.js";

const { verifyToken } = utils;

export const connectGmail = async (req, res) => {
  try {
    const token = req.query.token;

    const decoded = await verifyToken(token, process.env.JWT_SECRET);
    const userId = decoded.data.id;
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
      prompt: "consent",
      state: userId,
    });
    console.log("CONNECT HIT");
    res.redirect(url);
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

export const oauthCallback = async (req, res) => {
  try {
    const code = req.query.code;
    const userId = req.query.state;

    // 1. Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    oauth2Client.setCredentials(tokens);

    // 2. Get user email
    const gmail = google.gmail({
      version: "v1",
      auth: oauth2Client,
    });

    const profile = await gmail.users.getProfile({
      userId: "me",
    });

    const email = profile.data.emailAddress;

    // 3. Store in DB
    const existing = await getGmailAccountByEmailAndUserIdService(
      email,
      userId,
    );

    await insertGmailAccountService({
      userId,
      email,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || existing?.refreshToken,
      tokenExpiry: tokens.expiry_date,
    });

    // 4. Redirect to frontend
    res.redirect("http://localhost:5173/dashboard/");
  } catch (err) {
    console.log(err);
    res.send("OAuth Failed");
  }
};

export const getGmailAccountsController = async () => {
  try {
    const gmailAccounts = await getGmailAccountsService();
    return gmailAccounts;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const deleteGmailAccountController = async (email, userId) => {
  try {
    const result = await deleteGmailAccountService(email, userId);
    return result;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const sendEmailController = async({ to, subject, body }) => {
  try {
    
  } catch (error) {
    console.error(error);
    throw error;
  }
}