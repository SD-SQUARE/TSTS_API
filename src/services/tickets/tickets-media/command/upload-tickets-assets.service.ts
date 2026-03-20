import { t } from "i18next";
import { ICreateResponse } from "../../../../interfaces/response/ICreateResponse.js";
import { ticketNotFound } from "../../../../responses/tickets.js";
import { UserData } from "../../../../types/UserData.js";
import logger from "../../../../utils/logger.js";
import {
  buildActivityContent,
  ChangeMap,
  fetchExistingTicket,
} from "../../common.js";
import { uploadFilesWithUniqueKey } from "../../../../helpers/ImagesHelper.js";
import { IMAGE_PATHS } from "../../../../constants/imagePathes.js";
import { PostgresDataSource } from "../../../../database/postgres-data-source.js";
import { Media } from "../../../../entities/Media.js";
import { UploadedFile } from "../../../../types/UploadedFile.js";
import { formatActor } from "../../../../helpers/formatActor.js";
import { TicketActivityType } from "../../../../enums/TicketActivity.enum.js";
import { logTicketActivity } from "../../../tickets.service.js";
import { Request } from "express";
import { audit } from "../../../../helpers/auditBuilder.js";

// todo  Emit WebSocket event
export const uploadTicketAssetsService = async (
  ticketId: string,
  files: UploadedFile[],
  userData: UserData,
  req?: Request,
): Promise<ICreateResponse> => {
  const auditLog = audit(req);

  logger.info("[server][tickets-service] uploadTicketAssetsService | start", {
    ticketId,
    filesCount: Array.isArray(files) ? files.length : 0,
  });

  const existingTicket = await fetchExistingTicket(ticketId);

  if (!existingTicket) {
    auditLog.step("Ticket not found");

    logger.info(
      "[server][tickets-service] uploadTicketAssetsService | not found",
      { ticketId },
    );

    return ticketNotFound("is_added", ticketId) as ICreateResponse;
  }

  const mediaRepo = PostgresDataSource.getRepository(Media);

  const changes: ChangeMap = {};
  const createdMediaIds: string[] = [];
  const createdMediaUrls: string[] = [];
  const failedFiles: string[] = []; // Track failed files

  // helper to keep errors typed correctly
  const errObj = (key: string) => ({ key, message: t(key) });

  try {
    const safeFiles = Array.isArray(files) ? files.filter(Boolean) : [];

    const createdMedia = await Promise.all(
      safeFiles.map(async (file) => {
        if (!file?.originalname) return null;

        try {
          const safeKey = await uploadFilesWithUniqueKey(
            IMAGE_PATHS.TicketMedia,
            ticketId,
            file,
          );

          const row = mediaRepo.create({
            ticket: existingTicket,
            name: file.originalname,
            mime: file.mimetype || null,
            url: safeKey,
          });

          const saved = await mediaRepo.save(row);

          if (saved?.id) createdMediaIds.push(saved.id);
          createdMediaUrls.push(safeKey);

          return saved;
        } catch (err) {
          // Log and track the failed file
          logger.error(
            `[server][tickets-service] Failed to upload file: ${file.originalname}`,
            {
              error: err?.message,
            },
          );
          failedFiles.push(file.originalname); // Track the file that failed
          return null;
        }
      }),
    );

    const addedCount = createdMedia.filter(Boolean).length;

    if (addedCount === 0 && failedFiles.length === safeFiles.length) {
      auditLog.metadata({ failedFiles }).step("All file uploads failed");

      // If all files failed
      logger.info(
        "[server][tickets-service] uploadTicketAssetsService | all files failed to upload",
        { ticketId },
      );

      return {
        is_added: false,
        message: t("ticket.at_least_one_file_required"),
        errors: [
          errObj("ticket.at_least_one_file_required"),
          {
            key: "ticket.failed_files",
            message: `Failed to upload: ${failedFiles.join(", ")}`,
          },
        ],
      };
    }

    // Build changes map to make activity content consistent
    changes.media = {
      from: { count: 0 },
      to: { count: addedCount, urls: createdMediaUrls },
    };

    const { actor, actorText } = formatActor(userData);
    const activityContent = buildActivityContent(changes);

    await logTicketActivity(
      existingTicket,
      "Media Uploaded",
      TicketActivityType.INFO,
      `Ticket "${existingTicket.title}" media uploaded by ${actorText}: ${activityContent}`,
      actor.id,
      {
        actor,
        changes,
        updatedFields: Object.keys(changes),
        mediaIds: createdMediaIds,
      },
    );

    auditLog
      .metadata({
        addedCount,
        failedCount: failedFiles.length,
        createdMediaIds,
      })
      .step("Ticket media uploaded and activity logged");

    logger.info(
      "[server][tickets-service] uploadTicketAssetsService | completed",
      {
        ticketId,
        addedCount,
        createdMediaIdsCount: createdMediaIds.length,
      },
    );

    return {
      is_added: true,
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
    };
  } catch (e: any) {
    auditLog
      .metadata({ error: e?.message })
      .step("Ticket media upload failed (exception)");

    logger.error(
      "[server][tickets-service] uploadTicketAssetsService | failed",
      {
        ticketId,
        error: e?.message,
        stack: e?.stack,
      },
    );

    return {
      is_added: false,
      message: t("ticket.media_upload_failed"),
      errors: [errObj("ticket.media_upload_failed")],
    };
  }
};
