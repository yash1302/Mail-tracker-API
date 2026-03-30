import mongoose from "mongoose";

const trackedEmailSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, index: true },
  gmailAccountId: { type: mongoose.Schema.Types.ObjectId, index: true },
  gmailMessageId: String,
  gmailThreadId: { type: String, index: true },
  subject: String,
  to: [String],
  cc: [String],
  bcc: [String],
  trackingId: { type: String, unique: true },
  status: {
    type: String,
    enum: ["SENT", "FAILED"],
    default: "SENT",
  },
  opensCount: { type: Number, default: 0 },
  clicksCount: { type: Number, default: 0 },
  lastClickedAt: Date,
  isReplied: { type: Boolean, default: false },
  sentAt: { type: Date, default: Date.now },
  lastActivityAt: Date,
  bodyPreview: String,
  htmlBody: String, 
  textBody: String, 
  attachmentsMeta: [
    {
      filename: String,
      mimeType: String,
      size: Number,
    },
  ],
});

export default mongoose.model("TrackedEmail", trackedEmailSchema);
