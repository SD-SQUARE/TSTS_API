import { t } from "i18next";
import logger from "../../../../utils/logger.js";
import { fetchExistingTicket } from "../../common.js";
import { PostgresDataSource } from "../../../../database/postgres-data-source.js";
import { Media } from "../../../../entities/Media.js";
import { ITicketAssetDto } from "../../../../interfaces/ticket-media/ITicketAssetDto.js";
import { getPresignedUrl } from "../../../../utils/storage.js";

export const getTicketAssetsService = async (ticketId: string) => {
  logger.info("[server][tickets-media] getTicketAssetsService | start", {
    ticketId,
  });

  const existingTicket = await fetchExistingTicket(ticketId);
  if (!existingTicket) {
    return {
      ok: false,
      message: t("ticket.not_found"),
      errors: [{ key: "ticket.not_found", message: t("ticket.not_found") }],
      data: [],
    };
  }

  const mediaRepo = PostgresDataSource.getRepository(Media);

  const assets = await mediaRepo.find({
    where: { ticket: { id: ticketId } },
    order: { createdAt: "DESC" as any }, // remove if Media doesn't have createdAt
  });

  const data: ITicketAssetDto[] = await Promise.all(
    assets.map(async (m: any) => ({
      id: m.id,
      fileName: m.name,
      mime: m.mime ?? null,
      url: await getPresignedUrl(process.env.MINIO_BUCKET, m.url, 3600),
    }))
  );

  logger.info("[server][tickets-media] getTicketAssetsService | completed", {
    ticketId,
    count: data.length,
  });

  return {
    ok: true,
    message: t("ticket.assets_loaded") || "Assets loaded",
    errors: [],
    data,
  };
};

export const getSingleTicketAssetService = async (
  ticketId: string,
  assetId: string
) => {
  logger.info("[server][tickets-media] getSingleTicketAssetService | start", {
    ticketId,
    assetId,
  });

  const existingTicket = await fetchExistingTicket(ticketId);
  if (!existingTicket) {
    return {
      ok: false,
      message: t("ticket.not_found"),
      errors: [{ key: "ticket.not_found", message: t("ticket.not_found") }],
      data: null,
    };
  }

  const mediaRepo = PostgresDataSource.getRepository(Media);

  // IMPORTANT: filter by both ticketId and assetId so users can't read other ticket media
  const asset = await mediaRepo.findOne({
    where: { id: assetId, ticket: { id: ticketId } },
  });

  if (!asset) {
    logger.warn("[server][tickets-media] Asset not found for ticket", {
      ticketId,
      assetId,
    });

    return {
      ok: false,
      message: t("ticket.asset_not_found") || "Asset not found",
      errors: [
        {
          key: "ticket.asset_not_found",
          message: t("ticket.asset_not_found") || "Asset not found",
        },
      ],
      data: null,
    };
  }

  const transformedAsset = {
    id: asset.id,
    name: asset.name,
    mime: asset.mime ?? null,
    url: await getPresignedUrl(process.env.MINIO_BUCKET, asset.url, 3600), // assuming the function exists
  };

  // Successfully found the asset
  logger.info("[server][tickets-media] Asset found", { ticketId, assetId });

  return {
    ok: true,
    message: t("ticket.asset_loaded") || "Asset loaded",
    errors: [],
    data: transformedAsset,
  };
};
