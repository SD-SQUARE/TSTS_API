import { t } from "i18next";
import { UploadedFile } from "../../../types/UploadedFile.js";
import { UserData } from "../../../types/UserData.js";
import { IServiceResponse } from "../../../interfaces/shared/IServiceResponse.js";
import { ITicketAssetDto } from "../../../interfaces/ticket-media/ITicketAssetDto.js";
import logger from "../../../utils/logger.js";
import {
  buildActivityContent,
  ChangeMap,
  fetchExistingTicket,
} from "../common.js";
import { PostgresDataSource } from "../../../database/postgres-data-source.js";
import { Media } from "../../../entities/Media.js";
import { uploadFilesWithUniqueKey } from "../../../helpers/ImagesHelper.js";
import { IMAGE_PATHS } from "../../../constants/imagePathes.js";
import { getPresignedUrl } from "../../../utils/storage.js";
import { formatActor } from "../../../helpers/formatActor.js";
import { logTicketActivity } from "../../tickets.service.js";
import { TicketActivityType } from "../../../enums/TicketActivity.enum.js";

export const uploadTicketChatMediaService = async (
  ticketId: string,
  files: UploadedFile[],
  userData: UserData
): Promise<IServiceResponse<ITicketAssetDto[]>> => {
  logger.info(
    "[server][tickets-service][uploadTicketChatMediaService] | start",
    {
      ticketId,
      filesCount: Array.isArray(files) ? files.length : 0,
    }
  );

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

  const changes: ChangeMap = {};
  const createdMediaIds: string[] = [];
  const createdMediaKeys: string[] = [];
  const failedFiles: string[] = [];

  try {
    const safeFiles = Array.isArray(files) ? files.filter(Boolean) : [];

    const createdMedia = await Promise.all(
      safeFiles.map(async (file) => {
        if (!file?.originalname) return null;

        try {
          const safeKey = await uploadFilesWithUniqueKey(
            IMAGE_PATHS.TicketMedia,
            ticketId,
            file
          );

          const row = mediaRepo.create({
            ticket: existingTicket,
            name: file.originalname,
            mime: file.mimetype || null,
            url: safeKey,
          });

          const saved = await mediaRepo.save(row);

          if (saved?.id) createdMediaIds.push(saved.id);
          createdMediaKeys.push(safeKey);

          return saved;
        } catch (err: any) {
          logger.error(
            `[server][tickets-service][uploadTicketChatMediaService] Failed to upload file: ${file.originalname}`,
            { error: err?.message }
          );
          failedFiles.push(file.originalname);
          return null;
        }
      })
    );

    const okMedia = createdMedia.filter(Boolean) as Media[];
    const addedCount = okMedia.length;

    // If everything failed
    if (addedCount === 0 && failedFiles.length === safeFiles.length) {
      return {
        ok: false,
        message: t("ticket.media_upload_failed"),
        errors: [
          {
            key: "ticket.media_upload_failed",
            message: t("ticket.media_upload_failed"),
          },
          {
            key: "ticket.failed_files",
            message: `Failed to upload: ${failedFiles.join(", ")}`,
          },
        ],
        data: [],
      };
    }

    // Build response like getTicketAssetsService
    const data: ITicketAssetDto[] = await Promise.all(
      okMedia.map(async (m: any) => ({
        id: m.id,
        fileName: m.name,
        mime: m.mime ?? null,
        url: await getPresignedUrl(process.env.MINIO_BUCKET, m.url, 3600),
      }))
    );

    // Activity logging
    changes.media = {
      oldStatus: { count: 0 },
      newStatus: { count: addedCount, urls: createdMediaKeys },
    };

    const { actor, actorText } = formatActor(userData);
    const activityContent = buildActivityContent(changes);

    await logTicketActivity(
      existingTicket,
      "chat Media Uploaded",
      TicketActivityType.INFO,
      `Ticket "${existingTicket.title}" chat media uploaded by ${actorText}: ${activityContent}`,
      actor.id,
      {
        actor,
        changes,
        updatedFields: Object.keys(changes),
        mediaIds: createdMediaIds,
      }
    );

    return {
      ok: true,
      message: t("ticket.media_uploaded"),
      errors:
        failedFiles.length > 0
          ? [
              {
                key: "ticket.failed_files",
                message: `Failed to upload: ${failedFiles.join(", ")}`,
              },
            ]
          : [],
      data,
    };
  } catch (e: any) {
    logger.error(
      "[server][tickets-service][uploadTicketChatMediaService] | failed",
      {
        ticketId,
        error: e?.message,
        stack: e?.stack,
      }
    );

    return {
      ok: false,
      message: t("ticket.media_upload_failed"),
      errors: [
        {
          key: "ticket.media_upload_failed",
          message: t("ticket.media_upload_failed"),
        },
      ],
      data: [],
    };
  }
};
