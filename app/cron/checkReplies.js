// cron/checkRepliesCron.js

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";

import { checkRepliesController } from "../controllers/followup.controller.js";
import GmailAccount from "../models/gmailAccountsModels.js";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
    process.exit(1);
  }
};

const runReplyChecker = async () => {
  try {
    console.log("==================================");
    console.log("Starting Reply Check Cron Job");
    console.log("==================================");

    const gmailAccounts = await GmailAccount.find({
      isActive: true,
    }).select("_id userId email");

    console.log(`Found ${gmailAccounts.length} Gmail accounts`);

    let totalChecked = 0;
    let totalReplies = 0;

    for (const account of gmailAccounts) {
      try {
        console.log(`Checking replies for: ${account.email}`);

        const result = await checkRepliesController(
          account.userId,
          account._id,
        );

        totalChecked += result?.totalChecked || 0;
        totalReplies += result?.repliesFound || 0;

        console.log({
          email: account.email,
          checked: result?.totalChecked || 0,
          replies: result?.repliesFound || 0,
        });

        // Small delay to avoid Gmail API rate limits
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error({
          email: account.email,
          error: error.message,
        });
      }
    }

    console.log("==================================");
    console.log("Reply Check Cron Completed");
    console.log("==================================");

    console.log({
      accounts: gmailAccounts.length,
      totalChecked,
      totalReplies,
    });

    process.exit(0);
  } catch (error) {
    console.error("Cron Job Failed:", error);

    process.exit(1);
  }
};

(async () => {
  await connectDB();

  await runReplyChecker();
})();