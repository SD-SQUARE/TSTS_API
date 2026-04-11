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

export type ChangeMap = Record<string, { from: any; to: any }>;

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
  changes[field] = { from: oldValue, to: newValue };

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

  changes.specialization = { from: oldId, to: newId };

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

  changes.problem = { from: oldId, to: newId };

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
  changes.assigneeList = { from: oldList, to: newList };
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
        `${key}: ${JSON.stringify(changes[key].from)} → ${JSON.stringify(
          changes[key].to
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
    const activityType = mapStatusToActivityType(changes.status.to);

    await logTicketActivity(
      updatedTicket,
      "Status Changed",
      activityType,
      `Ticket status changed by ${actorText} from ${changes.status.from} to ${changes.status.to}`,
      actor.id,
      { actor, statusChange: changes.status,
        new: changes.status.to,
        old: changes.status.from
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
        changes.isOutOfService.to ? "out of service" : "in service"
      }`,
      actor.id,
      { actor, serviceStatusChange: changes.isOutOfService,
        new: changes.isOutOfService.to,
        old: changes.isOutOfService.from
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
