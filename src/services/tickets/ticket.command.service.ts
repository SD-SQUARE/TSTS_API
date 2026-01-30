import { t } from "i18next";
import { PostgresDataSource } from "../../database/postgres-data-source.js";
import { IDeleteResponse } from "../../interfaces/response/IDeleteResponse.js";
import logger from "../../utils/logger.js";
import { Ticket } from "../../entities/Ticket.js";
import { logTicketActivity } from "../tickets.service.js";
import { TicketActivityType } from "../../enums/TicketActivity.enum.js";

// todo  Emit WebSocket event `ticket:update` type `deleted`.
export const deleteTicketService = async (
  id: string
): Promise<IDeleteResponse> => {
  const ticketRepo = PostgresDataSource.getRepository(Ticket);

  const ticketEntity = await ticketRepo.findOne({ where: { id } });

  if (!ticketEntity) {
    return { is_deleted: false, message: t("ticket.not_found") };
  }

  //   await ticketEntity.softDelete(id);
  ticketEntity.deletedAt = new Date();
  await ticketRepo.update(id, ticketEntity);

  // log ticket deletion
  await logTicketActivity(
    ticketEntity,
    "Ticket deleted",
    TicketActivityType.Deleted,
    `Ticket "${ticketEntity.title}" deleted by ${ticketEntity.id}`,
    {
      requesterId: ticketEntity.id,
      specializationId: ticketEntity.specialization || null,
    }
  );

  logger.info(`[server] [user] Deleted ticket ${ticketEntity.id}`);
  return { is_deleted: true, message: t("ticket.deleted") };
};
