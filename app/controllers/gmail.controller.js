import { google } from "googleapis";
import { oauth2Client } from "../config/google.js";
import { insertGmailAccountService } from "../services/gmail.services.js";

export const connectGmail = (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    prompt: "consent",
  });

  res.redirect(url);
};

export const oauthCallback = async (req, res) => {
  try {
    const code = req.query.code;

    // 1. Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    oauth2Client.setCredentials(tokens);

    // 2. Get user email
    const gmail = google.gmail({
      version: "v1",
      auth: oauth2Client,
    });

    const profile = await gmail.users.getProfile({
      userId: "me",
    });

    const email = profile.data.emailAddress;

    // 3. Store in DB
    await insertGmailAccountService({
      userId: "69b2958a4c9e262d03c1377e",
      email,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiry: tokens.expiry_date,
      isPrimary: true,
    });

    // 4. Redirect to frontend
    res.redirect("http://localhost:3000/settings?gmail=connected");
  } catch (err) {
    console.log(err);
    res.send("OAuth Failed");
  }
};
