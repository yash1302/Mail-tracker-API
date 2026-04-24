import mongoose from "mongoose";

const draftSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, index: true },
  gmailAccountId: { type: mongoose.Schema.Types.ObjectId, index: true },
  subject: String,
  htmlBody: String,
  textBody: String,
  bodyPreview: String,
  draftTitle: String,
  attachmentsMeta: [
    {
      filename: String,
      mimeType: String,
      size: Number,
      url: String,
    },
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model("Draft", draftSchema);