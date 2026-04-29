import { LogModel } from "../models/logs.model.js";

export const logInfo = async (message, meta = {}) => {
  try {
    await LogModel.create({
      type: "INFO",
      message,
      meta,
    });
  } catch (err) {
    console.error("Failed to store log:", err.message);
  }
};

export const logError = async (message, meta = {}) => {
  try {
    await LogModel.create({
      type: "ERROR",
      message,
      meta,
    });
  } catch (err) {
    console.error("Failed to store log:", err.message);
  }
};
