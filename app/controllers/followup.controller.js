import { google } from "googleapis";
import {
  addTrackingPixel,
  cleanReplyBody,
  getOAuthClient,
  linkifyIfNeeded,
  replaceLinksWithTracking,
  sanitizeEmailHtml,
  stripHtml,
} from "../../common/utils.js";
import {
  checkRepliesService,
  getGmailAccountByIdService,
  updateTrackedEmailService,
} from "../services/gmail.services.js";
import {
  getFollowUpsService,
  updateFollowUpService,
} from "../services/followup.services.js";
import followupModel from "../models/followup.model.js";
import messageModel from "../models/messageModel.js";
import { v4 as uuidv4 } from "uuid";
import { getAttachmentsMetaByDraftIdService } from "../services/draft.services.js";
import utils from "../../common/utils.js";
const { downloadFileFromUrl } = utils;

export const checkRepliesController = async (userId, gmailAccountId) => {
  try {
    const account = await getGmailAccountByIdService(gmailAccountId, userId);

    const emails = await checkRepliesService(userId, gmailAccountId);

    if (!emails.length) {
      return {
        success: true,
        totalChecked: 0,
        repliesFound: 0,
        data: [],
      };
    }

    const auth = getOAuthClient(account.refreshToken);

    const gmail = google.gmail({
      version: "v1",
      auth,
    });

    const results = [];

    for (const email of emails) {
      try {
        const thread = await gmail.users.threads.get({
          userId: "me",
          id: email.threadId,
        });

        const messages = thread.data.messages || [];

        const replyMessages = messages.filter((msg) => {
          const fromHeader = msg.payload.headers.find((h) => h.name === "From");

          if (!fromHeader) return false;

          return !fromHeader.value.includes(account.email);
        });

        if (!replyMessages.length) continue;

        for (const reply of replyMessages) {
          const gmailMessageId = reply.id;

          const exists = await messageModel.findOne({
            gmailMessageId,
          });

          if (exists) continue;

          const headers = reply.payload.headers;

          const from = headers.find((h) => h.name === "From")?.value;
          const subject = headers.find((h) => h.name === "Subject")?.value;

          const to = headers.filter((h) => h.name === "To").map((h) => h.value);

          let htmlBody = "";

          if (reply.payload.parts) {
            const htmlPart = reply.payload.parts.find(
              (p) => p.mimeType === "text/html",
            );

            if (htmlPart?.body?.data) {
              htmlBody = Buffer.from(htmlPart.body.data, "base64").toString();
            }
          } else if (reply.payload.body?.data) {
            htmlBody = Buffer.from(
              reply.payload.body.data,
              "base64",
            ).toString();
          }

          const cleanedBody = cleanReplyBody(htmlBody);

          await messageModel.create({
            userId,
            gmailAccountId,
            threadId: email.threadId,
            gmailMessageId,
            type: "reply",
            direction: "incoming",
            from,
            to,
            subject,

            htmlBody: cleanedBody,
            textBody: stripHtml(cleanedBody),
            bodyPreview: stripHtml(cleanedBody).slice(0, 200),

            isReplied: true,
            receivedAt: new Date(parseInt(reply.internalDate)),
          });
        }

        await updateTrackedEmailService(email.threadId);

        await updateFollowUpService(email.threadId, userId);

        results.push({
          threadId: email.threadId,
          subject: email.subject,
          replied: true,
        });
      } catch (err) {
        console.error("Error checking thread:", err.message);
      }
    }

    return {
      success: true,
      totalChecked: emails.length,
      repliesFound: results.length,
      data: results,
    };
  } catch (error) {
    console.error("Check Replies Error:", error);
    return {
      success: false,
      message: "Failed to check replies",
    };
  }
};

export const getFollowUpsController = async (userId, gmailAccountId) => {
  const data = await getFollowUpsService(userId, gmailAccountId);

  return {
    success: true,
    total: data.length,
    data,
  };
};

export const updateFollowUpStatusController = async (followUpId, action) => {
  let update = {};

  if (action === "snooze") {
    update = { status: "Stopped", isActive: true, stoppedReason: "MANUAL" };
  }

  if (action === "dismiss") {
    update = { status: "Stopped", isActive: false, stoppedReason: "MANUAL" };
  }

  if (action === "complete") {
    update = {
      status: "Completed",
      isActive: false,
      stoppedReason: "MANUAL",
      lastFollowUpSentAt: new Date(),
    };
  }

  if (action === "resume") {
    update = { status: "Pending", isActive: true };
  }

  return followupModel.findByIdAndUpdate(
    followUpId,
    { $set: update },
    { new: true },
  );
};

export const sendFollowUpController = async (
  userId,
  messageId,
  gmailAccountId,
  html,
  files = [],
  attachmentIds = [],
  draftId = null,
) => {
  try {
    if (attachmentIds.length > 0 && !draftId) {
      throw new Error("draftId is required when using attachmentIds");
    }

    const account = await getGmailAccountByIdService(gmailAccountId, userId);
    if (!account) throw new Error("Gmail account not found");

    const email = await messageModel.findById(messageId);
    if (!email) throw new Error("Message not found");

    const auth = getOAuthClient(account.refreshToken);

    const gmail = google.gmail({
      version: "v1",
      auth,
    });

    const hasReply = await messageModel.exists({
      threadId: email.threadId,
      type: "reply",
      direction: "incoming",
    });

    // 🔥 DECIDE TYPE
    const finalType = hasReply ? "reply" : "followup";

    const thread = await gmail.users.threads.get({
      userId: "me",
      id: email.threadId,
    });

    const messages = thread.data.messages || [];
    const lastMessage = messages[messages.length - 1];

    const gmailMessageId = lastMessage?.payload?.headers?.find(
      (h) => h.name === "Message-Id",
    )?.value;

    const trackingId = uuidv4();

    let finalHtml = html;
    finalHtml = sanitizeEmailHtml(finalHtml);
    // finalHtml = linkifyIfNeeded(finalHtml);
    finalHtml = replaceLinksWithTracking(finalHtml, trackingId);
    finalHtml = addTrackingPixel(finalHtml, trackingId);

    const subject = email.subject.startsWith("Re:")
      ? email.subject
      : `Re: ${email.subject}`;

    let storedAttachments = [];
    if (attachmentIds.length) {
      storedAttachments = await getAttachmentsMetaByDraftIdService(
        draftId,
        attachmentIds,
      );
    }

    const processedFiles = files.map((file) => ({
      filename: file.originalname,
      mimeType: file.mimetype,
      base64: file.buffer.toString("base64"),
    }));

    const storedFilesWithBuffer = await Promise.all(
      storedAttachments.map(async (file) => {
        const buffer = await downloadFileFromUrl(file.url);
        return { ...file, buffer };
      }),
    );

    const outerBoundary = `mixed_${Date.now()}`;
    const innerBoundary = `alt_${Date.now()}`;

    const headers = [
      `To: ${email.to.join(", ")}`,
      email.cc?.length ? `Cc: ${email.cc.join(", ")}` : null,
      email.bcc?.length ? `Bcc: ${email.bcc.join(", ")}` : null,
      `Subject: ${subject}`,
      `From: ${account.email}`,
      gmailMessageId ? `In-Reply-To: ${gmailMessageId}` : null,
      gmailMessageId ? `References: ${gmailMessageId}` : null,
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

    for (const file of storedFilesWithBuffer) {
      attachmentParts.push(
        [
          `--${outerBoundary}`,
          `Content-Type: ${file.mimeType}; name="${file.filename}"`,
          "Content-Transfer-Encoding: base64",
          `Content-Disposition: attachment; filename="${file.filename}"`,
          "",
          file.buffer.toString("base64"),
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
      requestBody: {
        raw: encodedMessage,
        threadId: email.threadId,
      },
    });

    await messageModel.create({
      userId,
      gmailAccountId,
      threadId: email.threadId,
      gmailMessageId: response.data.id,
      type: finalType,
      direction: "outgoing",

      from: account.email,
      to: email.to,
      cc: email.cc,
      bcc: email.bcc,

      subject,
      htmlBody: finalHtml,
      textBody: stripHtml(finalHtml),
      bodyPreview: stripHtml(finalHtml).slice(0, 200),

      trackingId,

      attachmentsMeta: [
        ...storedAttachments,
        ...processedFiles.map((f) => ({
          filename: f.filename,
          mimeType: f.mimeType,
          size: f.base64.length,
        })),
      ],

      sentAt: new Date(),
    });
    if (finalType === "followup") {
      await followupModel.findOneAndUpdate(
        { threadId: email.threadId, userId },
        {
          $inc: { followUpCount: 1 },
          $set: {
            lastFollowUpSentAt: new Date(),
            nextFollowUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            status: "Pending",
            isActive: true,
          },
        },
      );
    }

    return {
      success: true,
      message:
        finalType === "reply"
          ? "Reply sent successfully"
          : "Follow-up sent successfully",
    };
  } catch (error) {
    console.error("Send Follow-up Error:", error);
    return {
      success: false,
      message: error.message || "Failed to send follow-up",
    };
  }
};
