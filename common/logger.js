import fs from "fs";
import path from "path";

const logFilePath = path.join(process.cwd(), "logs.txt");

export const logInfo = (message) => {
const log = `[INFO] ${new Date().toISOString()} - ${message}\n`;
fs.appendFileSync(logFilePath, log);
};

export const logError = (message) => {
const log = `[ERROR] ${new Date().toISOString()} - ${message}\n`;
fs.appendFileSync(logFilePath, log);
};
