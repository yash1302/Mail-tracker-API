import { google } from "googleapis";
import { oauth2Client } from "../config/google.js";
import {
  createTrackedEmailService,
  deleteGmailAccountService,
  getGmailAccountByEmailAndUserIdService,
  getGmailAccountByIdService,
  getGmailAccountsService,
  insertGmailAccountService,
} from "../services/gmail.services.js";
import utils, {
  addTrackingPixel,
  getOAuthClient,
  replaceLinksWithTracking,
  stripHtml,
} from "../../common/utils.js";
import { gmailMessages } from "../messages/gmail.messages.js";
import { v4 as uuidv4 } from "uuid";
const { GMAILACCOUNTNOTFOUND } = gmailMessages;

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

export const sendEmailController = async (
  to,
  cc,
  bcc,
  subject,
  html,
  gmailAccountId,
  userId,
) => {
  try {
    // 🔹 1. Get Gmail account (DB)
    const account = await getGmailAccountByIdService(gmailAccountId, userId);

    if (!account) {
      throw new Error(GMAILACCOUNTNOTFOUND);
    }

    // 🔹 2. Generate trackingId
    const trackingId = uuidv4();

    // 🔹 3. Inject tracking (uncomment when ready)
    let finalHtml = addTrackingPixel(html, trackingId);
    finalHtml = replaceLinksWithTracking(finalHtml, trackingId);

    // 🔹 4. Create OAuth client
    const auth = getOAuthClient(account.refreshToken);

    const gmail = google.gmail({
      version: "v1",
      auth,
    });

    // 🔹 5. Build message with proper RFC 5322 format
    const boundary = `boundary_${Date.now()}`;

    const headers = [
      `To: ${to.join(", ")}`,
      cc?.length > 0 ? `Cc: ${cc.join(", ")}` : null,
      bcc?.length > 0 ? `Bcc: ${bcc.join(", ")}` : null,
      `Subject: ${subject}`,
      `From: ${account.email}`,
      `Date: ${new Date().toUTCString()}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ].filter(Boolean);

    const textPart = `--${boundary}\r\nContent-Type: text/plain; charset="UTF-8"\r\nContent-Transfer-Encoding: 7bit\r\n\r\n${stripHtml(finalHtml)}\r\n`;

    const htmlPart = `--${boundary}\r\nContent-Type: text/html; charset="UTF-8"\r\nContent-Transfer-Encoding: 7bit\r\n\r\n${finalHtml}\r\n`;

    const closingBoundary = `--${boundary}--`;

    const message = [
      headers.join("\r\n"),
      "\r\n",
      textPart,
      htmlPart,
      closingBoundary,
    ].join("\r\n");

    // Encode to base64url
    const encodedMessage = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    // 🔹 6. Send email
    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encodedMessage },
    });

    // 🔹 7. Save in DB (SERVICE)
    const email = await createTrackedEmailService({
      userId,
      gmailAccountId,
      gmailMessageId: response.data.id,
      gmailThreadId: response.data.threadId,
      subject,
      to,
      cc,
      bcc,
      trackingId,
      bodyPreview: finalHtml.slice(0, 200),
    });

    return {
      success: true,
      data: email,
    };
  } catch (error) {
    console.error("Send Email Error:", error);
    throw error;
  }
};

export const checkEmailReadStatus = async (
  gmailAccountId,
  userId,
  gmailMessageId,
) => {
  try {
    const account = await getGmailAccountByIdService(gmailAccountId, userId);

    if (!account) {
      throw new Error(GMAILACCOUNTNOTFOUND);
    }

    // 🔹 4. Create OAuth client
    const auth = getOAuthClient(account.refreshToken);

    const gmail = google.gmail({ version: "v1", auth });

    const message = await gmail.users.messages.get({
      userId: "me",
      id: gmailMessageId,
    });

    // If UNREAD label is gone, email was opened
    const isRead = !message.data.labelIds?.includes("UNREAD");
    return isRead;
  } catch (error) {
    console.error("Error checking read status:", error);
    throw error;
  }
};
