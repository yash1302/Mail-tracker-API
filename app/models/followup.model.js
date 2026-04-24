import mongoose from "mongoose";

const followUpSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, index: true },
  gmailAccountId: { type: mongoose.Schema.Types.ObjectId, index: true },

  threadId: { type: String, index: true },

  followUpCount: { type: Number, default: 0 },

  nextFollowUpDate: Date,
  lastFollowUpSentAt: Date,

  status: {
    type: String,
    enum: ["Pending", "Completed", "Stopped"],
    default: "Pending",
  },

  isActive: { type: Boolean, default: true },

  stoppedReason: {
    type: String,
    enum: ["REPLIED", "MANUAL", null],
    default: null,
  },

  createdAt: { type: Date, default: Date.now },
});

followUpSchema.index({ threadId: 1 });

export default mongoose.model("FollowUp", followUpSchema);