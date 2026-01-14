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
      name: m.name,
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
