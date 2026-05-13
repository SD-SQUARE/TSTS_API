import { t } from "i18next";
import { PostgresDataSource } from "../../database/postgres-data-source.js";
import { IDeleteResponse } from "../../interfaces/response/IDeleteResponse.js";
import logger from "../../utils/logger.js";
import { Ticket } from "../../entities/Ticket.js";
import { logTicketActivity } from "../tickets.service.js";
import { TicketActivityType } from "../../enums/TicketActivity.enum.js";
import { Request } from "express";
import { audit } from "../../helpers/auditBuilder.js";
import { invalidateTicketAnalyticsCache } from "./ticket-cache.service.js";

// todo  Emit WebSocket event `ticket:update` type `deleted`.
export const deleteTicketService = async (
  id: string,
  userId: string,
  req?: Request,
): Promise<IDeleteResponse> => {
  const auditLog = audit(req);
  const ticketRepo = PostgresDataSource.getRepository(Ticket);

  auditLog.step("Fetching ticket from database");

  const ticketEntity = await ticketRepo.findOne({ where: { id } });

  if (!ticketEntity) {
    auditLog.step("Ticket not found");

    return { is_deleted: false, message: t("ticket.not_found") };
  }

  auditLog.step("Performing soft delete");

  //   await ticketEntity.softDelete(id);
  ticketEntity.deletedAt = new Date();
  await ticketRepo.update(id, ticketEntity);
  await invalidateTicketAnalyticsCache();

  auditLog.step("Ticket soft-deleted");

  // log ticket deletion
  await logTicketActivity(
    ticketEntity,
    "Ticket deleted",
    TicketActivityType.Deleted,
    `Ticket "${ticketEntity.title}" deleted by ${userId}`,
    userId,
    {
      requesterId: ticketEntity.id,
      specializationId: ticketEntity.specialization || null,
    },
  );

  auditLog.step("Deletion activity logged");

  logger.info(`[server] [user] Deleted ticket ${ticketEntity.id}`);
  return { is_deleted: true, message: t("ticket.deleted") };
};
