import { t } from "i18next";
import { In } from "typeorm";
import { UserData } from "../../../types/UserData.js";
import { IServiceResponse } from "../../../interfaces/shared/IServiceResponse.js";
import logger from "../../../utils/logger.js";
import {
  fetchExistingTicket,
  notifyTicketParticipantsOfChatMessage,
} from "../common.js";
import { PostgresDataSource } from "../../../database/postgres-data-source.js";
import { Media } from "../../../entities/Media.js";
import { getPresignedUrl } from "../../../utils/storage.js";
import { TicketChatMessage } from "../../../entities/TicketChatMessage.js";
import { User } from "../../../entities/User.js";
import { ITicketChatMessageResponseDto } from "../../../interfaces/ticket-chat/ITicketChatMessageResponseDto.js";
import { getFullNameByLang } from "../../../helpers/UserPersonalData.helper.js";
import { Lang } from "../../../types/lang.types.js";

export const createTicketChatMessageService = async (
  ticketId: string,
  senderId: string,
  mediaIds: string[],
  message?: string | null,
  lang?: Lang,
): Promise<IServiceResponse<ITicketChatMessageResponseDto | null>> => {
  logger.info("[server][tickets-chat] createTicketChatMessageService | start", {
    ticketId,
    senderId,
    mediaIdsCount: Array.isArray(mediaIds) ? mediaIds.length : 0,
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

  const userRepo = PostgresDataSource.getRepository(User);
  const mediaRepo = PostgresDataSource.getRepository(Media);
  const ticketChatRepo = PostgresDataSource.getRepository(TicketChatMessage);

  try {
    const sender = await userRepo.findOne({ where: { id: senderId } });
    if (!sender) {
      return {
        ok: false,
        message: t("auth.user_not_found") || "User not found",
        errors: [
          {
            key: "auth.user_not_found",
            message: t("auth.user_not_found") || "User not found",
          },
        ],
        data: null,
      };
    }

    const safeMediaIds = Array.isArray(mediaIds)
      ? Array.from(new Set(mediaIds.filter(Boolean)))
      : [];

    // Load media rows (and ensure they belong to this ticket)
    const mediaRows = safeMediaIds.length
      ? await mediaRepo.find({
          where: {
            id: In(safeMediaIds),
            ticket: { id: ticketId } as any, // assumes Media has ticket relation
          } as any,
        })
      : [];

    // Create chat message entity
    const chat = ticketChatRepo.create({
      ticket: existingTicket,
      sender,
      message: message ?? null,
      attachments: mediaRows,
    });

    const savedChat = await ticketChatRepo.save(chat);

    // Re-load with relations to ensure attachments are present (ManyToMany not eager by default)
    const fullChat = await ticketChatRepo.findOne({
      where: { id: savedChat.id } as any,
      relations: { attachments: true } as any,
    });

    const attachments = fullChat?.attachments ?? mediaRows;

    const media = await Promise.all(
      attachments.map(async (m: any) => ({
        id: m.id,
        fileName: m.name,
        mime: m.mime ?? null,
        url: await getPresignedUrl(process.env.MINIO_BUCKET, m.url, 3600),
      })),
    );

    const response: ITicketChatMessageResponseDto = {
      id: fullChat?.id ?? savedChat.id,
      message: fullChat?.message ?? message ?? null,
      media,
      sender: {
        id: sender.id,
        name: getFullNameByLang(sender, lang),
        image:
          sender.image == null
            ? null
            : await getPresignedUrl(
                process.env.MINIO_BUCKET,
                sender.image,
                3600,
              ),
      },
      ticketId,
      createdAt: (fullChat?.createdAt ?? savedChat.createdAt).toISOString(),
    };

    await notifyTicketParticipantsOfChatMessage(
      existingTicket,
      {
        id: sender.id,
        email: sender.email,
        fullNameEn: getFullNameByLang(sender, "en"),
        fullNameAr: getFullNameByLang(sender, "ar"),
      },
      response.message,
    );

    return {
      ok: true,
      message: t("ticket.message_sent") || "Message sent",
      errors: [],
      data: response,
    };
  } catch (e: any) {
    logger.error(
      "[server][tickets-chat] createTicketChatMessageService | failed",
      {
        ticketId,
        senderId,
        error: e?.message,
        stack: e?.stack,
      },
    );

    return {
      ok: false,
      message: t("ticket.message_send_failed") || "Failed to send message",
      errors: [
        {
          key: "ticket.message_send_failed",
          message: t("ticket.message_send_failed") || "Failed to send message",
        },
      ],
      data: null,
    };
  }
};
