import { google } from "googleapis";
import { getOAuthClient } from "../../common/utils.js";
import {
  checkRepliesService,
  getGmailAccountByIdService,
  updateTrackedEmailService,
} from "../services/gmail.services.js";
import { updateFollowUpService } from "../services/followup.services.js";

export const checkRepliesController = async (userId, gmailAccountId, Email) => {
  try {
    const account = await getGmailAccountByIdService(gmailAccountId, userId);
    const emails = await checkRepliesService(userId);
    if (!emails.length) {
      throw new Error("No tracked emails found for this account");
    }

    const results = [];

    for (const email of emails) {
      try {
        // 2. Get OAuth client (you already use this in send)
        const auth = getOAuthClient(account.refreshToken);

        const gmail = google.gmail({
          version: "v1",
          auth,
        });

        // 3. Get thread
        const thread = await gmail.users.threads.get({
          userId: "me",
          id: email.gmailThreadId,
        });

        const messages = thread.data.messages || [];

        // 4. Check if any message is from someone else
        const hasReply = messages.some((msg) => {
          const headers = msg.payload.headers;

          const fromHeader = headers.find((h) => h.name === "From");

          if (!fromHeader) return false;

          return !fromHeader.value.includes(Email);
        });

        if (hasReply) {
          await updateTrackedEmailService(email._id);

          // 6. Stop follow-ups (if using FollowUp model)
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


export const getFollowUpsController = async (userId) => {
  try {
    const followups = await getFollowUpsService(userId);

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
