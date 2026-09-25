import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

console.log("CLIENT_ID:", process.env.CLIENT_ID);
console.log("CLIENT_SECRET:", process.env.CLIENT_SECRET);
console.log("REDIRECT_URI:", process.env.REDIRECT_URI);
export const createOAuth2Client = (redirectUri) => {
  return new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    redirectUri,
  );
};
