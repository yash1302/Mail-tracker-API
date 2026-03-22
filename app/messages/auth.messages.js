import { messageHandler } from "../../common/messageHandlers.js";
import { errorMessages } from "../../constants/responseMessages.constants.js";
import { errorStatusCodes } from "../../constants/responseStatus.constants.js";

const { conflict, notFound, unauthorized } = errorStatusCodes;
const { conflictMessage, notFoundMessage, unauthorizedMessage,userAlreadyExists } = errorMessages;

export const authMessages = {
  USERPRESENT: new messageHandler(conflict, userAlreadyExists),
  LOGINFAILURE: new messageHandler(notFound, notFoundMessage),
  UNAUTHORIZED: new messageHandler(unauthorized, unauthorizedMessage),
};
