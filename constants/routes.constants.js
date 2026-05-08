export const routesConstants = {
  AUTH: "/api/auth",
  GMAIL: "/api/gmail",
  DRAFT: "/api/draft",
  FOLLOWUP: "/api/followup",
  AI_REPLY: "/api/ai",
};

export const authRoutesConstants = {
  SIGNUP: "/signup",
  LOGIN: "/login",
  SEND_OTP: "/send-otp",
  VERIFY_OTP: "/verify-otp",
  SIGNUP_GOOGLE: "/googleSignin",
  OAUTH_CALLBACK: "/oauth/callback",
};

export const gmailRoutesConstants = {
  CONNECT: "/connect",
  OAUTH2CALLBACK: "/oauth/callback",
  GMAIL_ACCOUNT: "/accounts",
  SEND_EMAIL: "/send",
  OPEN_EMAIL_TRACKING: "/t/open/:trackingId",
  CLICK_LINK_TRACKING: "/t/click/:trackingId",
  GET_EMAILS: "/",
  GET_CLICK_STATS: "/t/stats/:trackingId",
  DOWNLOAD_ATTACHMENT: "/attachment/:messageId/:filename",
  DASHBOARD_KPI: "/dashboard-kpi",
};

export const draftRoutesConstants = {
  CREATE_DRAFT: "/",
  GET_DRAFTS: "/",
  DELETE_DRAFT: "/:draftId",
  UPDATE_DRAFT: "/",
  GET_DRAFT: "/:draftId",
};

export const followUpRoutesConstants = {
  CREATE_FOLLOWUP: "/create",
  GET_FOLLOWUPS: "/list",
  UPDATE_FOLLOWUP: "/:followUpId",
  DELETE_FOLLOWUP: "/:followUpId",
  CHECK_REPLIES: "/check-replies",
  UPDATE_FOLLOWUP_STATUS: "/:followUpId/status",
  SEND_FOLLOWUP: "/send-followup",
};

export const aiRoutesConstants = {
  GENERATE_REPLY: "/generate-reply",
};
