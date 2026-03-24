import { messageHandler } from "../../common/messageHandlers.js";
import { errorMessages } from "../../constants/responseMessages.constants.js";
import { errorStatusCodes } from "../../constants/responseStatus.constants.js";

const { conflict, notFound, unauthorized } = errorStatusCodes;
const { conflictMessage, notFoundMessage, unauthorizedMessage } = errorMessages;

export const gmailMessages = {
  GMAILACCOUNTNOTFOUND: new messageHandler(notFound, notFoundMessage),
};
