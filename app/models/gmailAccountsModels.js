import mongoose from "mongoose";

const gmailAccountSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  email: { type: String, required: true },
  accessToken: { type: String, required: true },
  refreshToken: { type: String, required: true },
  tokenExpiry: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  isPrimary: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
});
gmailAccountSchema.index({ userId: 1, email: 1 }, { unique: true });

const GmailAccount = mongoose.model("GmailAccount", gmailAccountSchema);

export default GmailAccount;
