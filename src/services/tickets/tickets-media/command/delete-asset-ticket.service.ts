import { t } from "i18next";
import { UserData } from "../../../../types/UserData.js";
import logger from "../../../../utils/logger.js";
import { fetchExistingTicket } from "../../common.js";
import { PostgresDataSource } from "../../../../database/postgres-data-source.js";
import { Media } from "../../../../entities/Media.js";
import { formatActor } from "../../../../helpers/formatActor.js";
import { logTicketActivity } from "../../../tickets.service.js";
import { TicketActivityType } from "../../../../enums/TicketActivity.enum.js";
import { IDeleteResponse } from "../../../../interfaces/response/IDeleteResponse.js";
import { deleteFile } from "../../../../utils/storage.js";

export const deleteSingleTicketAssetService = async (
  ticketId: string,
  assetId: string,
  userData: UserData
): Promise<IDeleteResponse> => {
  logger.info(
    "[server][tickets-media] deleteSingleTicketAssetService | start",
    {
      ticketId,
      assetId,
    }
  );

  const existingTicket = await fetchExistingTicket(ticketId);
  if (!existingTicket) {
    return {
      is_deleted: false,
      message: t("ticket.not_found"),
      errors: [{ key: "ticket.not_found", message: t("ticket.not_found") }],
    };
  }

  const mediaRepo = PostgresDataSource.getRepository(Media);

  const asset = await mediaRepo.findOne({
    where: { id: assetId, ticket: { id: ticketId } },
  });

  if (!asset) {
    logger.warn("[server][tickets-media] Asset not found for ticket", {
      ticketId,
      assetId,
    });

    return {
      is_deleted: false,
      message: t("ticket.asset_not_found") || "Asset not found",
      errors: [
        {
          key: "ticket.asset_not_found",
          message: t("ticket.asset_not_found") || "Asset not found",
        },
      ],
    };
  }

  await deleteFile(process.env.MINIO_BUCKET, asset.url);

  // Delete the asset
  await mediaRepo.remove(asset);

  // Log the deletion activity
  const { actor, actorText } = formatActor(userData);
  await logTicketActivity(
    existingTicket,
    "Asset Deleted",
    TicketActivityType.INFO,
    `Asset "${asset.name}" was deleted by ${actorText}.`,
    { actor, assetId: asset.id, assetName: asset.name }
  );

  // Return success response
  logger.info("[server][tickets-media] Asset deleted successfully", {
    ticketId,
    assetId,
  });

  return {
    is_deleted: true,
    message: t("ticket.asset_deleted") || "Asset deleted successfully",
    errors: [],
  };
};
