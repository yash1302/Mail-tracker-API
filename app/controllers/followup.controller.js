import { google } from "googleapis";
import { getOAuthClient } from "../../common/utils.js";
import {
  checkRepliesService,
  getGmailAccountByIdService,
  updateTrackedEmailService,
} from "../services/gmail.services.js";
import { getFollowUpsService, updateFollowUpService } from "../services/followup.services.js";
import followupModel from "../models/followup.model.js";

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
          id: email.gmailThreadId,
        });

        const messages = thread.data.messages || [];

        const hasReply = messages.some((msg) => {
          const headers = msg.payload.headers;

          const fromHeader = headers.find((h) => h.name === "From");

          if (!fromHeader) return false;

          return !fromHeader.value.includes(account.email);
        });

        if (hasReply) {
          await updateTrackedEmailService(email._id);

          await updateFollowUpService(email.gmailThreadId);

          results.push({
            emailId: email._id,
            to: email.to,
            subject: email.subject,
            replied: true,
          });
        }
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
  try {
    const followups = await getFollowUpsService(userId, gmailAccountId);

    return {
      success: true,
      total: followups.length,
      data: followups,
    };
  } catch (error) {
    console.error("Get FollowUps Error:", error);
    return {
      success: false,
      message: "Failed to fetch followups",
    };
  }
};


export const updateFollowUpStatusController = async (followUpId, action) => {
  if (!followUpId || !action) {
    throw new Error("followUpId and action are required");
  }

  const validActions = ["snooze", "dismiss", "complete","resume"];
  if (!validActions.includes(action)) {
    throw new Error(`Invalid action. Must be one of: ${validActions.join(", ")}`);
  }

  let update = {};

  if (action === "snooze") {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 7);
    update = {
      nextFollowUpDate: nextDate,
      status: "Pending",
      isActive: true,
    };
  } else if (action === "dismiss") {
    update = {
      status: "Ignored",
      isActive: false,
    };
  } else if (action === "complete") {
    update = {
      status: "Completed",
      isActive: false,
      lastFollowUpSentAt: new Date(),
    };
  } else if (action === "resume") {
    update = {
      status: "Pending",
      isActive: true,
    };
  }


  const updated = await followupModel.findByIdAndUpdate(
    followUpId,
    { $set: update },
    { new: true }
  );

  if (!updated) throw new Error("Follow-up not found");

  return updated;
};