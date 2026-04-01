export const routesConstants = {
  AUTH: "/api/auth",
  GMAIL: "/api/gmail",
  DRAFT: "/api/draft",
};

export const authRoutesConstants = {
  SIGNUP: "/signup",
  LOGIN: "/login",
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
};

export const draftRoutesConstants = {
  CREATE_DRAFT: "/",
  GET_DRAFTS: "/",
  DELETE_DRAFT: "/:draftId",
  UPDATE_DRAFT: "/",
  GET_DRAFT: "/:draftId",
};
