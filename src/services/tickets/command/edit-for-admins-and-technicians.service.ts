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
  notifyTicketParticipantsOfChanges,
  saveTicketUpdates,
} from "../common.js";
import { IEditResponse } from "../../../interfaces/response/IEditResponse.js";
import { UserData } from "../../../types/UserData.js";
import { Request } from "express";
import { audit } from "../../../helpers/auditBuilder.js";
import { invalidateTicketAnalyticsCache } from "../ticket-cache.service.js";

// todo  Emit WebSocket event
export const editTicketForAdminAndTechniciansService = async (
  ticketId: string,
  updateData: any,
  userData: UserData,
  req?: Request,
): Promise<IEditResponse> => {
  const auditLog = audit(req);
  logger.info("[server][tickets] editTicket | start", { ticketId, updateData });

  auditLog.step("Fetching existing ticket");

  const existingTicket = await fetchExistingTicket(ticketId);

  if (!existingTicket) {
    auditLog.step("Fetching existing ticket");

    logger.info("[server][tickets] editTicket | ticket not found", {
      ticketId,
    });

    return ticketNotFound("is_edited", ticketId) as IEditResponse;
  }

  const changes: ChangeMap = {};
  const updates: any = {};
  const wsFlag = { value: false };

  auditLog.step("Applying primitive updates");

  applyPrimitiveUpdate(
    "title",
    updateData,
    existingTicket,
    updates,
    changes,
    wsFlag,
    false,
  );

  applyPrimitiveUpdate(
    "description",
    updateData,
    existingTicket,
    updates,
    changes,
    wsFlag,
    false,
  );

  applyPrimitiveUpdate(
    "status",
    updateData,
    existingTicket,
    updates,
    changes,
    wsFlag,
    true,
  );

  applyPrimitiveUpdate(
    "priority",
    updateData,
    existingTicket,
    updates,
    changes,
    wsFlag,
    false,
  );

  applyPrimitiveUpdate(
    "isOutOfService",
    updateData,
    existingTicket,
    updates,
    changes,
    wsFlag,
    true,
  );

  auditLog
    .metadata({ changedFields: Object.keys(changes) })
    .step("Primitive fields processed");

  const specializationError = await handleSpecializationUpdate(
    updateData,
    existingTicket,
    updates,
    changes,
  );
  if (specializationError) {
    auditLog.step("Specialization update failed");
    return specializationError;
  }

  const problemError = await handleProblemUpdate(
    updateData,
    existingTicket,
    updates,
    changes,
  );
  if (problemError) {
    auditLog.step("Problem update failed");
    return problemError;
  }
  const assigneeError = await handleAssigneeListUpdate(
    updateData,
    existingTicket,
    updates,
    changes,
    wsFlag,
  );
  if (assigneeError) {
    auditLog.step("Assignee update failed");
    return assigneeError;
  }

  auditLog.step("Saving ticket updates");

  const updatedTicket = await saveTicketUpdates(existingTicket, updates);
  await invalidateTicketAnalyticsCache();

  logger.info("[server][tickets] editTicket | ticket updated", {
    ticketId: updatedTicket.id,
    changes,
    shouldEmitWebSocket: wsFlag.value,
  });

  auditLog
    .metadata({
      changes,
      shouldEmitWebSocket: wsFlag.value,
    })
    .step("Ticket updated in database");

  await logGeneralUpdateActivity(updatedTicket, changes, userData, req);
  await logSpecificActivities(updatedTicket, changes, userData, req);
  await notifyTicketParticipantsOfChanges(updatedTicket, changes, userData);

  auditLog.step("Activities logged");

  maybeLogWebSocketIntent(wsFlag.value, updatedTicket, changes);

  if (wsFlag.value) {
    auditLog.step("WebSocket event should be emitted");
  }

  logger.info("[server][tickets] editTicket | completed", {
    ticketId: updatedTicket.id,
    updatedFields: Object.keys(changes),
  });

  auditLog
    .metadata({ updatedFields: Object.keys(changes) })
    .step("Edit ticket flow completed");

  return {
    is_edited: true,
    message: t("ticket_updated"),
    errors: [],
  };
};
