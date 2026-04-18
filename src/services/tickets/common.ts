import { Request } from "express";
import { PostgresDataSource } from "../../database/postgres-data-source.js";
import { Problem, Specialization } from "../../entities/index.js";
import { Ticket } from "../../entities/Ticket.js";
import { User } from "../../entities/User.js";
import { TicketActivityType } from "../../enums/TicketActivity.enum.js";
import { formatActor } from "../../helpers/formatActor.js";
import { mapStatusToActivityType } from "../../helpers/ticketsHelper.js";
import { IEditResponse } from "../../interfaces/response/IEditResponse.js";
import { assigneeNotFound } from "../../responses/assignees.js";
import { problemNotFound } from "../../responses/problem.js";
import { specializationNotFound } from "../../responses/specializations.js";
import { UserData } from "../../types/UserData.js";
import logger from "../../utils/logger.js";
import { logTicketActivity } from "../tickets.service.js";
import { createNotification } from "../notification.service.js";
import { NotificationType } from "../../enums/NotificationType.enum.js";

export type ChangeMap = Record<string, { oldStatus: any; newStatus: any }>;

const ticketRepo = PostgresDataSource.getRepository(Ticket);
const userRepo = PostgresDataSource.getRepository(User);
const specializationRepo = PostgresDataSource.getRepository(Specialization);
const problemRepo = PostgresDataSource.getRepository(Problem);


export const applyPrimitiveUpdate = (
  field: string,
  updateData: any,
  existingTicket: any,
  updates: any,
  changes: ChangeMap,
  wsFlag: { value: boolean },
  shouldEmitForThisField: boolean
) => {
  if (updateData[field] === undefined) return;

  const oldValue = existingTicket[field];
  const newValue = updateData[field];

  // Only update if changed
  if (isEqualShallow(oldValue, newValue)) return;

  updates[field] = newValue;
  changes[field] = { oldStatus: oldValue, newStatus: newValue };

  if (shouldEmitForThisField) {
    wsFlag.value = true;
  }
};
export const isEqualShallow = (a: any, b: any) => a === b;

export const isStringArrayEqualAsSet = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  if (sa.size !== a.length) {
    // duplicates exist; fallback to exact compare
    return a.join("|") === b.join("|");
  }
  for (const x of b) if (!sa.has(x)) return false;
  return true;
};

export const fetchExistingTicket = async (ticketId: string) => {
  return ticketRepo.findOne({
    where: { id: ticketId },
    relations: ["requester", "specialization", "assigneeList", "problem"],
  });
};

export const handleSpecializationUpdate = async (
  updateData: any,
  existingTicket: Ticket,
  updates: any,
  changes: ChangeMap
): Promise<IEditResponse | null> => {
  if (updateData.specialization === undefined) return null;

  const oldId = existingTicket.specialization?.id || null;
  const newId = updateData.specialization || null;

  // If no change, do nothing (no updates, no changes)
  if (oldId === newId) return null;

  if (updateData.specialization) {
    const specialization = await specializationRepo.findOne({
      where: { id: updateData.specialization },
    });

    if (!specialization)
      return specializationNotFound("is_edited") as IEditResponse;

    updates.specialization = specialization;
  } else {
    updates.specialization = null;
  }

  changes.specialization = { oldStatus: oldId, newStatus: newId };

  return null;
};

export const handleProblemUpdate = async (
  updateData: any,
  existingTicket: Ticket,
  updates: any,
  changes: ChangeMap
): Promise<IEditResponse | null> => {
  if (updateData.problem === undefined) return null;

  const oldId = existingTicket.problem?.id || null;
  const newId = updateData.problem || null;

  // If no change, do nothing (no updates, no changes)
  if (oldId === newId) return null;

  if (updateData.problem) {
    const problem = await problemRepo.findOne({
      where: { id: updateData.problem },
    });

    if (!problem)
      return problemNotFound("is_edited") as IEditResponse;

    updates.problem = problem;
  } else {
    updates.problem = null;
  }

  changes.problem = { oldStatus: oldId, newStatus: newId };

  return null;
};

export const handleAssigneeListUpdate = async (
  updateData: any,
  existingTicket: Ticket,
  updates: any,
  changes: ChangeMap,
  wsFlag: { value: boolean }
): Promise<IEditResponse | null> => {
  if (updateData.assigneeList === undefined) return null;

  const oldList = existingTicket.assigneeList?.map((u) => u.id) || [];
  const newList: string[] = updateData.assigneeList || [];

  // If no change, do nothing
  if (isStringArrayEqualAsSet(oldList, newList)) return null;

  const assigneeUsers: User[] = [];

  if (newList.length > 0) {
    for (const assigneeId of newList) {
      const user = await userRepo.findOne({ where: { id: assigneeId } });

      if (!user)
        return assigneeNotFound("is_edited", assigneeId) as IEditResponse;

      assigneeUsers.push(user);
    }
  }

  updates.assigneeList = assigneeUsers;
  changes.assigneeList = { oldStatus: oldList, newStatus: newList };
  wsFlag.value = true;

  return null;
};

export const saveTicketUpdates = async (
  existingTicket: Ticket,
  updates: any
) => {
  Object.assign(existingTicket, updates);
  return ticketRepo.save(existingTicket);
};

export const buildActivityContent = (changes: ChangeMap) => {
  return Object.keys(changes)
    .map(
      (key) =>
        `${key}: ${JSON.stringify(changes[key].oldStatus)} → ${JSON.stringify(
          changes[key].newStatus
        )}`
    )
    .join(", ");
};

export const logGeneralUpdateActivity = async (
  updatedTicket: Ticket,
  changes: ChangeMap,
  userData: UserData,
  req?: Request
) => {
  const activityContent = buildActivityContent(changes);

  const { actor, actorText } = formatActor(userData);

  await logTicketActivity(
    updatedTicket,
    "Ticket Updated",
    TicketActivityType.INFO,
    `Ticket "${updatedTicket.title}" was updated by ${actorText}: ${activityContent}`,
    actor.id,
    { actor, changes, updatedFields: Object.keys(changes) },
    req,
  );
};

export const logSpecificActivities = async (
  updatedTicket: Ticket,
  changes: ChangeMap,
  userdata: UserData,
  req?: Request,
) => {
  const { actor, actorText } = formatActor(userdata);

  if (changes.status) {
    const activityType = mapStatusToActivityType(changes.status.newStatus);

    await logTicketActivity(
      updatedTicket,
      "Status Changed",
      activityType,
      `Ticket status changed by ${actorText} from ${changes.status.oldStatus} to ${changes.status.newStatus}`,
      actor.id,
      { actor, statusChange: changes.status,
        newStatus: changes.status.newStatus,
        oldStatus: changes.status.oldStatus
       },
       req
    );
  }

  if (changes.assigneeList) {
    await logTicketActivity(
      updatedTicket,
      "Assignees Updated",
      TicketActivityType.ASSIGNEE,
      `Ticket assignees updated by ${actorText}`,
      actor.id,
      { actor, assigneeChange: changes.assigneeList },
      req,
    );
  }

  if (changes.isOutOfService) {
    await logTicketActivity(
      updatedTicket,
      "Service Status Changed",
      TicketActivityType.OUT_OF_SERVICE,
      `Ticket service status changed by ${actorText} to ${
        changes.isOutOfService.newStatus ? "out of service" : "in service"
      }`,
      actor.id,
      { actor, serviceStatusChange: changes.isOutOfService,
        newStatus: changes.isOutOfService.newStatus,
        oldStatus: changes.isOutOfService.oldStatus
       },
       req,
    );
  }
};

export const maybeLogWebSocketIntent = (
  shouldEmitWebSocket: boolean,
  updatedTicket: Ticket,
  changes: ChangeMap
) => {
  if (!shouldEmitWebSocket) return;

  logger.info(
    "[server][tickets] editTicket | WebSocket event should be emitted",
    {
      ticketId: updatedTicket.id,
      changes: {
        status: changes.status,
        assigneeList: changes.assigneeList,
        isOutOfService: changes.isOutOfService,
      },
    }
  );

  // WebSocket implementation would go here
  // Example: socketService.emitTicketUpdate(updatedTicket.id, changes);
};

const formatChangedField = (field: string) => {
  switch (field) {
    case "assigneeList":
      return "assignees";
    case "isOutOfService":
      return "service status";
    default:
      return field;
  }
};

const getTicketNotificationRecipients = (
  ticket: Ticket,
  excludedUserIds: string[] = [],
) => {
  const excluded = new Set(excludedUserIds.filter(Boolean));
  const participantIds = [
    ticket.requester?.id,
    ...(ticket.assigneeList || []).map((user) => user?.id),
  ].filter(Boolean) as string[];

  return Array.from(new Set(participantIds)).filter((id) => !excluded.has(id));
};

export const notifyTicketParticipantsOfChanges = async (
  ticket: Ticket,
  changes: ChangeMap,
  userData: UserData,
) => {
  const recipients = getTicketNotificationRecipients(ticket, [userData.id]);
  const changedFields = Object.keys(changes);

  if (!recipients.length || !changedFields.length) {
    return;
  }

  const actorName = userData.fullNameEn || userData.fullNameAr || userData.email;
  const changedSummary = changedFields.map(formatChangedField).join(", ");

  await createNotification(
    NotificationType.TICKET,
    `Ticket #${ticket.ticket_number} updated`,
    `${actorName} updated ${changedSummary} on "${ticket.title}".`,
    recipients,
    { ticketId: ticket.id },
  );
};

export const notifyTicketParticipantsOfStatusChange = async (
  ticket: Ticket,
  previousStatus: string,
  newStatus: string,
  actor: {
    id: string;
    email?: string;
    fullNameEn?: string;
    fullNameAr?: string;
  },
) => {
  const recipients = getTicketNotificationRecipients(ticket, [actor.id]);
  if (!recipients.length) {
    return;
  }

  const actorName = actor.fullNameEn || actor.fullNameAr || actor.email || "A user";

  await createNotification(
    NotificationType.TICKET,
    `Ticket #${ticket.ticket_number} status changed`,
    `${actorName} changed the status from ${previousStatus} to ${newStatus}.`,
    recipients,
    { ticketId: ticket.id },
  );
};

export const notifyTicketParticipantsOfChatMessage = async (
  ticket: Ticket,
  sender: {
    id: string;
    email?: string;
    fullNameEn?: string;
    fullNameAr?: string;
  },
  message?: string | null,
) => {
  const recipients = getTicketNotificationRecipients(ticket, [sender.id]);
  if (!recipients.length) {
    return;
  }

  const senderName =
    sender.fullNameEn || sender.fullNameAr || sender.email || "A user";
  const contentPreview = (message || "").trim();

  await createNotification(
    NotificationType.TICKET,
    `New ticket message on #${ticket.ticket_number}`,
    contentPreview
      ? `${senderName}: ${contentPreview}`
      : `${senderName} added a new attachment or empty message.`,
    recipients,
    { ticketId: ticket.id },
  );
};

export const getUserMetaById = async (userId: string) => {
  if (!userId) {
    return { full_name_en: null, full_name_ar: null, image: null, id: null };
  }

  const user = await userRepo.findOne({ where: { id: userId } });

  if (!user) {
    return { full_name_en: null, full_name_ar: null, image: null, id: null };
  }

  // Concatenate names in EN
  const full_name_en =
    [user.firstName?.en, user.midName?.en, user.lastName?.en]
      .filter(Boolean)
      .join(" ")
      .trim() || null;

  // Concatenate names in AR
  const full_name_ar =
    [user.firstName?.ar, user.midName?.ar, user.lastName?.ar]
      .filter(Boolean)
      .join(" ")
      .trim() || null;

  return {
    full_name_en,
    full_name_ar,
    image: user.image || null,
    id: user.id,
  };
};
