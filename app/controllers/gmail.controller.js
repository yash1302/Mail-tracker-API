import { google } from "googleapis";
import { oauth2Client } from "../config/google.js";
import {
  createMessageService,
  createThreadService,
  deleteGmailAccountService,
  getGmailAccountByEmailAndUserIdService,
  getGmailAccountByIdService,
  getGmailAccountsService,
  getTrackedEmailsService,
  incrementClickCountService,
  insertGmailAccountService,
} from "../services/gmail.services.js";
import utils, {
  addTrackingPixel,
  getOAuthClient,
  linkifyIfNeeded,
  replaceLinksWithTracking,
  sanitizeEmailHtml,
  stripHtml,
} from "../../common/utils.js";
import { gmailMessages } from "../messages/gmail.messages.js";
import { v4 as uuidv4 } from "uuid";
import { createFollowUpService } from "../services/followup.services.js";
import { getAttachmentsMetaByDraftIdService } from "../services/draft.services.js";
import DraftModel from "../models/draftModels.js";
import followupModel from "../models/followup.model.js";
import { getUserByIdService } from "../services/user.services.js";
import dotenv from "dotenv";
import messageModel from "../models/messageModel.js";
dotenv.config();
const { GMAILACCOUNTNOTFOUND } = gmailMessages;

const { verifyToken, downloadFileFromUrl } = utils;

// this controller is used to connect user's Gmail account via OAuth and store the credentials in DB
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

// this controller handles the OAuth callback, exchanges code for tokens, fetches user email and stores everything in DB
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
    res.redirect(`${process.env.FRONTEND_URL}/dashboard/`);
  } catch (err) {
    console.log(err);
    res.send("OAuth Failed");
  }
};

// controller to fetch all connected Gmail accounts for a user
export const getGmailAccountsController = async (userId) => {
  try {
    const user = await getUserByIdService(userId);
    const gmailAccounts = await getGmailAccountsService(userId);
    const result = gmailAccounts.map((account) => ({
      _id: account._id,
      userId: account.userId,
      email: account.email,
      __v: account.__v,
      accessToken: account.accessToken,
      createdAt: account.createdAt,
      isPrimary: false,

      tokenExpiry: account.tokenExpiry,
      isActive: account.isActive,
      user: user,
    }));
    return result;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

// controller to delete (deactivate) a Gmail account connection
export const deleteGmailAccountController = async (gmailAccountId) => {
  try {
    const result = await deleteGmailAccountService(gmailAccountId);
    return result;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

// controller to send email using Gmail API, with support for attachments, tracking pixels, and link tracking.
// It also creates corresponding records in the database for the sent email, thread, and follow-up.
export const sendEmailController = async (
  to,
  cc,
  bcc,
  subject,
  html,
  gmailAccountId,
  userId,
  attachmentIds = [],
  files = [],
  draftId = null,
) => {
  try {
    const account = await getGmailAccountByIdService(gmailAccountId, userId);
    if (!account) throw new Error(GMAILACCOUNTNOTFOUND);

    // getOAuthClient will create a new OAuth client instance with the account's refresh token,
    // which allows us to make authenticated requests to Gmail API on behalf of the user.
    const auth = getOAuthClient(account.refreshToken);
    const gmail = google.gmail({ version: "v1", auth });

    // storedAttachments will hold the metadata of attachments that are already uploaded and associated with the draft.
    let storedAttachments = [];
    if (attachmentIds.length) {
      storedAttachments = await getAttachmentsMetaByDraftIdService(
        draftId,
        attachmentIds,
      );
    }

    // processedFiles will convert the newly uploaded files into a format suitable for sending via Gmail API,
    // including converting the file buffer to base64 string.
    const processedFiles = files.map((file) => ({
      filename: file.originalname,
      mimeType: file.mimetype,
      base64: file.buffer.toString("base64"),
    }));

    const batch_size = 5;
    const results = [];

    for (let i = 0; i < to.length; i += batch_size) {
      const batch = to.slice(i, i + batch_size);

      const batchPromises = batch.map(async (recipient) => {
        try {
          const trackingId = uuidv4();
          let finalHtml = html;

          finalHtml = sanitizeEmailHtml(finalHtml);
          finalHtml = linkifyIfNeeded(finalHtml);
          finalHtml = replaceLinksWithTracking(finalHtml, trackingId);
          finalHtml = addTrackingPixel(finalHtml, trackingId);

          const outerBoundary = `mixed_${Date.now()}_${Math.random()}`;
          const innerBoundary = `alt_${Date.now()}_${Math.random()}`;

          const headers = [
            `To: ${recipient}`,
            cc?.length ? `Cc: ${cc.join(", ")}` : null,
            bcc?.length ? `Bcc: ${bcc.join(", ")}` : null,
            `Subject: ${subject}`,
            `From: ${account.email}`,
            `Date: ${new Date().toUTCString()}`,
            "MIME-Version: 1.0",
            `Content-Type: multipart/mixed; boundary="${outerBoundary}"`,
          ].filter(Boolean);

          const alternativePart = [
            `--${outerBoundary}`,
            `Content-Type: multipart/alternative; boundary="${innerBoundary}"`,
            "",
            `--${innerBoundary}`,
            `Content-Type: text/plain; charset="UTF-8"`,
            "",
            stripHtml(finalHtml),
            "",
            `--${innerBoundary}`,
            `Content-Type: text/html; charset="UTF-8"`,
            "",
            finalHtml,
            "",
            `--${innerBoundary}--`,
            "",
          ].join("\r\n");

          const attachmentParts = [];

          for (const file of storedAttachments) {
            const fileBuffer = await downloadFileFromUrl(file.url);

            attachmentParts.push(
              [
                `--${outerBoundary}`,
                `Content-Type: ${file.mimeType}; name="${file.filename}"`,
                "Content-Transfer-Encoding: base64",
                `Content-Disposition: attachment; filename="${file.filename}"`,
                "",
                fileBuffer.toString("base64"),
                "",
              ].join("\r\n"),
            );
          }

          for (const file of processedFiles) {
            attachmentParts.push(
              [
                `--${outerBoundary}`,
                `Content-Type: ${file.mimeType}; name="${file.filename}"`,
                "Content-Transfer-Encoding: base64",
                `Content-Disposition: attachment; filename="${file.filename}"`,
                "",
                file.base64,
                "",
              ].join("\r\n"),
            );
          }

          const message = [
            headers.join("\r\n"),
            "",
            alternativePart,
            ...attachmentParts,
            `--${outerBoundary}--`,
          ].join("\r\n");

          const encodedMessage = Buffer.from(message)
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");

          const response = await gmail.users.messages.send({
            userId: "me",
            requestBody: { raw: encodedMessage },
          });

          const threadId = response.data.threadId;
          const messageId = response.data.id;

          const participants = [
            account.email,
            recipient,
            ...(cc || []),
            ...(bcc || []),
          ];

          // these 3 DB uploads kept sequential cuz if any of upload is failed the other would
          // be created

          // 1. THREAD
          await createThreadService({
            threadId,
            userId,
            gmailAccountId,
            subject,
            participants,
          });

          // 2. MESSAGE
          await createMessageService({
            userId,
            gmailAccountId,
            threadId,
            gmailMessageId: messageId,
            type: "initial",
            from: account.email,
            to: [recipient],
            cc,
            bcc,
            subject,
            htmlBody: finalHtml,
            textBody: stripHtml(finalHtml),
            bodyPreview: stripHtml(finalHtml).slice(0, 200),
            trackingId,
            attachmentsMeta: [
              ...storedAttachments.map((f) => ({
                filename: f.filename,
                mimeType: f.mimeType,
                size: f.size,
                url: f.url,
              })),
              ...processedFiles.map((f) => ({
                filename: f.filename,
                mimeType: f.mimeType,
                size: f.base64.length,
              })),
            ],

            sentAt: new Date(),
          });

          // 3. FOLLOW-UP
          await createFollowUpService({
            threadId,
            userId,
            gmailAccountId,
          });

          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      await new Promise((res) => setTimeout(res, 1000));
    }

    return {
      success: true,
      total: to.length,
      results,
    };
  } catch (error) {
    console.error("Send Email Error:", error);
    throw error;
  }
};

// controller to track clicks on links in the email. It increments the click count for the email and redirects the user to the original URL.
export const trackClickController = async (req, res, next) => {
  try {
    const { trackingId } = req.params;
    const { url } = req.query;

    if (!trackingId || !url) {
      return res.status(400).json({
        success: false,
        message: "Invalid tracking link",
      });
    }

    const decodedUrl = decodeURIComponent(url);

    const userAgent = req.headers["user-agent"];
    const ip = req.ip;

    console.log("📩 Click Tracked:", {
      trackingId,
      decodedUrl,
      userAgent,
      ip,
    });

    const isBot = /bot|crawler|spider|crawling/i.test(userAgent);
    if (!isBot) {
      await incrementClickCountService(trackingId);
    }

    return res.redirect(decodedUrl);
  } catch (error) {
    next(error);
  }
};

// controller to fetch all tracked emails for a user and Gmail account.
// It returns the email threads along with their messages and metadata,
// which can be used to display the email history and analytics in the frontend.
export const getEmailsController = async (userId, gmailAccountId) => {
  try {
    const threads = await getTrackedEmailsService({
      userId,
      gmailAccountId,
    });

    return threads.map((thread) => ({
      threadId: thread.threadId,
      subject: thread.subject,
      participants: thread.participants,
      lastActivityAt: thread.lastActivityAt,

      messages: thread.messages.map((email) => ({
        id: email.id,
        type: email.type, // initial | followup | reply
        from: email.from,
        to: email.to,
        cc: email.cc,
        bcc: email.bcc,
        subject: email.subject,
        preview: email.bodyPreview,
        htmlBody: email.htmlBody,
        trackingId: email.trackingId,
        sentAt: email.sentAt,
        status: email.status || "sent",
        attachmentsMeta: email.attachmentsMeta || [],
        messageId: email.gmailMessageId,
        clicksCount: email.clicksCount || 0,
        opensCount: email.opensCount || 0,
        isReplied: email.isReplied || false,
      })),
    }));
  } catch (error) {
    console.error("Error fetching emails:", error);
    throw error;
  }
};

// download attachment controller to handle attachment download requests.
// It verifies the user's access to the Gmail account, fetches the email message, finds the requested attachment,
// and sends it as a response with appropriate headers for downloading.
export const downloadAttachmentController = async (req, res, next) => {
  try {
    const { messageId, filename } = req.params;
    const { gmailAccountId, userId } = req.query;

    const account = await getGmailAccountByIdService(gmailAccountId, userId);

    if (!account) {
      return res.status(404).json({ message: "Gmail account not found" });
    }

    const auth = getOAuthClient(account.refreshToken);

    const gmail = google.gmail({ version: "v1", auth });

    // 1. Get full message
    const message = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
    });

    const parts = message.data.payload.parts || [];

    // 2. Find attachment by filename
    let attachmentId = null;
    let mimeType = "application/octet-stream";

    const findAttachment = (parts) => {
      for (const part of parts) {
        if (part.filename === filename && part.body?.attachmentId) {
          attachmentId = part.body.attachmentId;
          mimeType = part.mimeType;
          return;
        }
        if (part.parts) {
          findAttachment(part.parts);
        }
      }
    };

    findAttachment(parts);

    if (!attachmentId) {
      return res.status(404).json({ message: "Attachment not found" });
    }

    // 🔹 3. Fetch attachment
    const attachment = await gmail.users.messages.attachments.get({
      userId: "me",
      messageId,
      id: attachmentId,
    });

    const fileData = attachment.data.data;

    const buffer = Buffer.from(fileData, "base64");

    // 🔹 4. Send file
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

export const getDashboardKPIController = async (userId, gmailAccountId) => {
  try {
    if (!userId || !gmailAccountId) {
      throw new Error("userId and gmailAccountId are required");
    }

    const baseFilter = { userId, gmailAccountId };
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalSent,
      totalRepliedThreads,
      totalClicked,
      totalDrafts,
      followedUpThreads,
      oldUnrepliedThreads,
      activeFollowupThreads,
    ] = await Promise.all([
      messageModel.countDocuments({
        ...baseFilter,
        type: "initial",
      }),

      messageModel.distinct("threadId", {
        ...baseFilter,
        type: "reply",
      }),

      messageModel.countDocuments({
        ...baseFilter,
        clicksCount: { $gt: 0 },
      }),

      DraftModel.countDocuments({ userId, gmailAccountId }),

      followupModel.distinct("threadId", {
        userId,
        gmailAccountId,
        followUpCount: { $gt: 0 },
        isActive: true,
      }),

      messageModel.distinct("threadId", {
        ...baseFilter,
        type: "initial",
        isReplied: false,
        sentAt: { $lte: sevenDaysAgo },
      }),

      followupModel.distinct("threadId", {
        userId,
        gmailAccountId,
        isActive: true,
      }),
    ]);

    const totalReplied = totalRepliedThreads.length;
    const uniqueFollowedUp = followedUpThreads.length;

    const activeFollowupSet = new Set(activeFollowupThreads.map(String));

    const followupNeeded = oldUnrepliedThreads.filter(
      (threadId) => !activeFollowupSet.has(threadId.toString()),
    ).length;

    const replyRate =
      totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0;

    const clickRate =
      totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0;

    const interestedLeads = Math.max(totalClicked - totalReplied, 0);

    const noResponse = totalSent - totalReplied - totalClicked;

    return {
      success: true,
      data: {
        totalSent,
        totalReplied,
        replyRate,

        totalClicked,
        clickRate,

        interestedLeads,
        noResponse,

        uniqueFollowedUp,
        followupNeeded,

        totalDrafts,
      },
    };
  } catch (error) {
    console.error("getDashboardKPI error:", error);
    throw error;
  }
};
