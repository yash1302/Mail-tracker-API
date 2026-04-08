import { google } from "googleapis";
import { oauth2Client } from "../config/google.js";
import {
  createTrackedEmailService,
  deleteGmailAccountService,
  getClickStatsService,
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
import trackedEmailModel from "../models/trackedEmail.model.js";
import DraftModel from "../models/draftModels.js";
import followupModel from "../models/followup.model.js";
import { getUserByIdService } from "../services/user.services.js";
import dotenv from "dotenv";
dotenv.config();
const { GMAILACCOUNTNOTFOUND } = gmailMessages;

const { verifyToken, downloadFileFromUrl } = utils;

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
    res.redirect(`${process.env.FRONTEND_URL}dashboard/`);
  } catch (err) {
    console.log(err);
    res.send("OAuth Failed");
  }
};

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

export const deleteGmailAccountController = async (gmailAccountId) => {
  try {
    const result = await deleteGmailAccountService(gmailAccountId);
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
  attachmentIds = [],
  files = [],
  draftId = null,
) => {
  try {
    const account = await getGmailAccountByIdService(gmailAccountId, userId);

    if (!account) throw new Error(GMAILACCOUNTNOTFOUND);

    const auth = getOAuthClient(account.refreshToken);

    const gmail = google.gmail({
      version: "v1",
      auth,
    });

    let storedAttachments = [];
    if (attachmentIds.length) {
      storedAttachments = await getAttachmentsMetaByDraftIdService(
        draftId,
        attachmentIds,
      );
    }

    const batch_size = 5;
    const results = [];

    const processedFiles = files.map((file) => ({
      filename: file.originalname,
      mimeType: file.mimetype,
      base64: file.buffer.toString("base64"),
    }));

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

          const emailData = {
            userId,
            gmailAccountId,
            gmailMessageId: response.data.id,
            gmailThreadId: response.data.threadId,
            subject,
            to: [recipient],
            cc,
            bcc,
            trackingId,
            bodyPreview: stripHtml(finalHtml).slice(0, 200),
            htmlBody: finalHtml,
            textBody: stripHtml(finalHtml),
          };

          if (processedFiles.length > 0) {
            emailData.attachmentsMeta = processedFiles.map((file) => ({
              filename: file.filename,
              mimeType: file.mimeType,
              size: file.base64.length,
            }));
          }

          const email = await createTrackedEmailService(emailData);
          await createFollowUpService({
            emailId: email._id,
            threadId: email.gmailThreadId,
            followUpCount: 0,
            nextFollowUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            status: "Pending",
            isActive: true,
            userId: userId,
            gmailAccountId: gmailAccountId,
          });

          return { success: true, data: email };
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

export const getEmailsController = async (userId, gmailAccountId) => {
  try {
    const emails = await getTrackedEmailsService({
      userId,
      gmailAccountId,
    });

    return emails.map((email) => ({
      id: email.id,
      subject: email.subject,
      to: email.to,
      cc: email.cc,
      bcc: email.bcc,
      preview: email.bodyPreview,
      trackingId: email.trackingId,
      sentAt: email.sentAt,
      status: email.status || "sent",
      attachmentsMeta: email.attachmentsMeta || [],
      messageId: email.gmailMessageId,
      clicksCount: email.clicksCount || 0,
      opensCount: email.opensCount || 0,
      isReplied: email.isReplied || false,
    }));
  } catch (error) {
    console.error("Error fetching emails:", error);
    throw error;
  }
};

export const getClickStatsController = async (trackingId) => {
  try {
    const data = await getClickStatsService(trackingId);

    return data;
  } catch (error) {
    next(error);
  }
};

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

    // 🔹 1. Get full message
    const message = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
    });

    const parts = message.data.payload.parts || [];

    // 🔹 2. Find attachment by filename
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
      totalReplied,
      totalClicked,
      totalDrafts,

      // emails that got at least one follow-up
      followedUpEmailIds,

      // old emails with no reply
      oldUnrepliedEmails,

      // emails that already have follow-up
      emailsWithFollowup,
    ] = await Promise.all([
      // total sent
      trackedEmailModel.countDocuments({ ...baseFilter, status: "SENT" }),

      // replies
      trackedEmailModel.countDocuments({
        ...baseFilter,
        status: "SENT",
        isReplied: true,
      }),

      // clicked (interest)
      trackedEmailModel.countDocuments({
        ...baseFilter,
        status: "SENT",
        clicksCount: { $gt: 0 },
      }),

      // drafts
      DraftModel.countDocuments({ userId, gmailAccountId }),

      // emails that have followups
      followupModel.distinct("emailId", {
        userId,
        gmailAccountId,
        followUpCount: { $gt: 0 },
        isActive: true,
      }),

      // old unreplied emails
      trackedEmailModel.find(
        {
          ...baseFilter,
          status: "SENT",
          isReplied: false,
          sentAt: { $lte: sevenDaysAgo },
        },
        { _id: 1 },
      ),

      // emails that already have followup
      followupModel.distinct("emailId", {
        userId,
        gmailAccountId,
        isActive: true,
      }),
    ]);

    // unique followed up emails
    const uniqueFollowedUp = followedUpEmailIds.length;

    // convert to set for fast lookup
    const emailsWithFollowupSet = new Set(
      emailsWithFollowup.map((id) => id.toString()),
    );

    // follow-up needed (important KPI)
    const followupNeeded = oldUnrepliedEmails.filter(
      (e) => !emailsWithFollowupSet.has(e._id.toString()),
    ).length;

    // derived KPIs
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

        interestedLeads, // ⭐ BEST KPI
        noResponse, // ⭐ ACTION KPI

        uniqueFollowedUp,
        followupNeeded,

        totalDrafts, // optional (can remove later)
      },
    };
  } catch (error) {
    console.error("getDashboardKPI error:", error);
    throw error;
  }
};
