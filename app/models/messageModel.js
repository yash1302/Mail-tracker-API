import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, index: true },
  gmailAccountId: { type: mongoose.Schema.Types.ObjectId, index: true },
  threadId: { type: String, index: true },
  gmailMessageId: String,
  type: {
    type: String,
    enum: ["initial", "followup", "reply"],
    index: true,
  },
  direction: {
    type: String,
    enum: ["outgoing", "incoming"],
    required: true,
    index: true,
  },
  from: String,
  to: [String],
  cc: [String],
  bcc: [String],
  subject: String,
  htmlBody: String,
  textBody: String,
  bodyPreview: String,
  attachmentsMeta: [
    {
      filename: String,
      mimeType: String,
      size: Number,
      url: String,
    },
  ],
  trackingId: String,
  clicksCount: { type: Number, default: 0 },
  lastOpenedAt: Date,
  lastClickedAt: Date,
  isReplied: { type: Boolean, default: false },
  sentAt: Date,
  receivedAt: Date,
  createdAt: { type: Date, default: Date.now },
});

messageSchema.index({ threadId: 1, sentAt: 1 });
messageSchema.index({ trackingId: 1 });

export default mongoose.model("Message", messageSchema);
