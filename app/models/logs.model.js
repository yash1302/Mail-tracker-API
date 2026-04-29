import mongoose from "mongoose";

const logSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["INFO", "ERROR"],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    meta: {
      type: Object, // optional extra data (email, payload, etc.)
      default: {},
    },
  },
  { timestamps: true },
);

export const LogModel = mongoose.model("logs", logSchema);
