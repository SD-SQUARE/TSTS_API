import { t } from "i18next";
import logger from "../../../utils/logger.js";
import { ticketNotFound } from "../../../responses/tickets.js";
import {
  applyPrimitiveUpdate,
  ChangeMap,
  fetchExistingTicket,
  handleAssigneeListUpdate,
  handleProblemUpdate,
  handleSpecializationUpdate,
  logGeneralUpdateActivity,
  logSpecificActivities,
  maybeLogWebSocketIntent,
  saveTicketUpdates,
} from "../common.js";
import { IEditResponse } from "../../../interfaces/response/IEditResponse.js";
import { UserData } from "../../../types/UserData.js";

// todo  Emit WebSocket event
export const editTicketForAdminAndTechniciansService = async (
  ticketId: string,
  updateData: any,
  userData: UserData
): Promise<IEditResponse> => {
  logger.info("[server][tickets] editTicket | start", { ticketId, updateData });

  const existingTicket = await fetchExistingTicket(ticketId);

  if (!existingTicket) {
    logger.info("[server][tickets] editTicket | ticket not found", {
      ticketId,
    });

    return ticketNotFound("is_edited", ticketId) as IEditResponse;
  }

  const changes: ChangeMap = {};
  const updates: any = {};
  const wsFlag = { value: false };

  applyPrimitiveUpdate(
    "title",
    updateData,
    existingTicket,
    updates,
    changes,
    wsFlag,
    false
  );

  applyPrimitiveUpdate(
    "description",
    updateData,
    existingTicket,
    updates,
    changes,
    wsFlag,
    false
  );

  applyPrimitiveUpdate(
    "status",
    updateData,
    existingTicket,
    updates,
    changes,
    wsFlag,
    true
  );

  applyPrimitiveUpdate(
    "priority",
    updateData,
    existingTicket,
    updates,
    changes,
    wsFlag,
    false
  );

  applyPrimitiveUpdate(
    "isOutOfService",
    updateData,
    existingTicket,
    updates,
    changes,
    wsFlag,
    true
  );

  const specializationError = await handleSpecializationUpdate(
    updateData,
    existingTicket,
    updates,
    changes
  );
  if (specializationError) return specializationError;

  const problemError = await handleProblemUpdate(
    updateData,
    existingTicket,
    updates,
    changes,
  );
  if (problemError) return problemError;

  const assigneeError = await handleAssigneeListUpdate(
    updateData,
    existingTicket,
    updates,
    changes,
    wsFlag
  );
  if (assigneeError) return assigneeError;

  const updatedTicket = await saveTicketUpdates(existingTicket, updates);

  logger.info("[server][tickets] editTicket | ticket updated", {
    ticketId: updatedTicket.id,
    changes,
    shouldEmitWebSocket: wsFlag.value,
  });

  await logGeneralUpdateActivity(updatedTicket, changes, userData);
  await logSpecificActivities(updatedTicket, changes, userData);

  maybeLogWebSocketIntent(wsFlag.value, updatedTicket, changes);

  logger.info("[server][tickets] editTicket | completed", {
    ticketId: updatedTicket.id,
    updatedFields: Object.keys(changes),
  });

  return {
    is_edited: true,
    message: t("ticket_updated"),
    errors: [],
  };
};
