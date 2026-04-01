import mongoose from "mongoose";

const draftSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, index: true },
  gmailAccountId: { type: mongoose.Schema.Types.ObjectId, index: true },
  subject: String,
  html_Body: String,
  text_body: String,
  body_preview: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  attachmentsMeta: [
    {
      filename: String,
      mimeType: String,
      size: Number,
    },
  ],
  draftTitle: String,
});
const DraftModel = mongoose.model("Draft", draftSchema);
export default DraftModel;
