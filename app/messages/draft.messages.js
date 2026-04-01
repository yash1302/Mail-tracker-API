import { messageHandler } from "../../common/messageHandlers.js";
import {
  errorMessages,
  successMessages,
} from "../../constants/responseMessages.constants.js";
import {
  errorStatusCodes,
  successStatusCodes,
} from "../../constants/responseStatus.constants.js";

export const draftMessages = {
  DRAFTCREATED: new messageHandler(
    successStatusCodes.created,
    successMessages.resourceCreatedSucessfully("Draft"),
  ),
  DRAFTNOTFOUND: new messageHandler(
    errorStatusCodes.notFound,
    errorMessages.resourceNotFound("Draft"),
  ),
  DRAFTDELETED: new messageHandler(
    successStatusCodes.ok,
    successMessages.resourceDeletedSucessfully("Draft"),
  ),
};
