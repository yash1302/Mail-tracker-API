import dotenv from "dotenv";
dotenv.config();

import cron from "node-cron";
import mongoose from "mongoose";

import { checkRepliesController } from "../controllers/followup.controller.js";
import GmailAccount from "../models/gmailAccountsModels.js";

// =========================
// MongoDB Connection
// =========================
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB Connected");
  } catch (error) {
    console.error(" MongoDB Connection Error:", error);

    process.exit(1);
  }
};

// =========================
// Reply Checker Function
// =========================
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

        // Delay to avoid Gmail API rate limits
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
  } catch (error) {
    console.error("Cron Job Failed:", error);
  }
};

// =========================
// Start Cron Scheduler
// =========================
const startCronJob = async () => {
  await connectDB();

  console.log("Reply Checker Cron Initialized");

  // Every 5 minutes
  cron.schedule("0 */4 * * *", async () => {
    console.log("Running scheduled cron job...");

    await runReplyChecker();
  });

  await runReplyChecker();
};

startCronJob();
