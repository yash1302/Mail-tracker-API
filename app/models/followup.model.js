import mongoose from "mongoose";

const followUpSchema = new mongoose.Schema({
  emailId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TrackedEmail",
    index: true,
  },

  threadId: { type: String, index: true },

  followUpCount: { type: Number, default: 0 },

  nextFollowUpDate: { type: Date },

  lastFollowUpSentAt: { type: Date },

  status: {
    type: String,
    enum: ["Pending", "Completed", "Ignored"],
    default: "Pending",
  },

  isActive: { type: Boolean, default: true },
});

const followupModel = mongoose.model("FollowUp", followUpSchema);
export default followupModel;
