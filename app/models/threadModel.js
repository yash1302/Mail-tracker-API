import mongoose from "mongoose";

const threadSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, index: true },
  gmailAccountId: { type: mongoose.Schema.Types.ObjectId, index: true },
  gmailThreadId: { type: String, index: true },
  subject: String,
  participants: [String],
  hasReply: { type: Boolean, default: false },
  lastActivityAt: Date,
  lastMessageAt: Date,
  createdAt: { type: Date, default: Date.now },
});

threadSchema.index({ userId: 1, gmailThreadId: 1 });

export default mongoose.model("Thread", threadSchema);