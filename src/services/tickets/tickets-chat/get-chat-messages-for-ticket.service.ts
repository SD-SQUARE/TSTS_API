import { t } from "i18next";
import { IServiceResponse } from "../../../interfaces/shared/IServiceResponse.js";
import logger from "../../../utils/logger.js";
import { fetchExistingTicket } from "../common.js";
import { PostgresDataSource } from "../../../database/postgres-data-source.js";
import { getPresignedUrl } from "../../../utils/storage.js";
import { ITicketChatMessageResponseDto } from "../../../interfaces/ticket-chat/ITicketChatMessageResponseDto.js";
import { TicketChatMessage } from "../../../entities/TicketChatMessage.js";
import { getFullNameByLang } from "../../../helpers/UserPersonalData.helper.js";
import { Lang } from "../../../types/lang.types.js";

export const getChatMessagesForTicketServices = async (
  ticketId: string,
  lang?: Lang,
): Promise<IServiceResponse<ITicketChatMessageResponseDto[]>> => {
  logger.info(
    "[server][tickets-service][getChatMessagesForTicketServices] | start",
    { ticketId },
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

  const ticketChatRepo = PostgresDataSource.getRepository(TicketChatMessage);

  try {
    const messages = await ticketChatRepo.find({
      where: {
        ticket: { id: ticketId } as any,
      } as any,
      relations: {
        attachments: true,
      } as any,
      order: {
        createdAt: "DESC",
      },
    });

    const data: ITicketChatMessageResponseDto[] = await Promise.all(
      messages.map(async (msg: any) => {
        const media = await Promise.all(
          (msg.attachments ?? []).map(async (m: any) => ({
            id: m.id,
            fileName: m.name,
            mime: m.mime ?? null,
            url: await getPresignedUrl(process.env.MINIO_BUCKET, m.url, 3600),
          })),
        );

        return {
          id: msg.id,
          message: msg.message ?? null,
          media,
          sender: {
            id: msg.sender.id,
            name: getFullNameByLang(msg.sender, lang),
            job: msg.sender.job?.[lang ?? "en"] ?? msg.sender.job?.en ?? null,
            user_type: msg.sender.user_type ?? null,
            image:
              msg.sender.image == null
                ? null
                : await getPresignedUrl(
                    process.env.MINIO_BUCKET,
                    msg.sender.image,
                    3600,
                  ),
          },
          ticketId,
          createdAt: msg.createdAt?.toISOString?.() ?? new Date().toISOString(),
        };
      }),
    );

    logger.info(
      "[server][tickets-service][getChatMessagesForTicketServices] | completed",
      { ticketId, count: data.length },
    );

    return {
      ok: true,
      message: t("ticket.chats_loaded") || "Chats loaded",
      errors: [],
      data: data.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    };
  } catch (e: any) {
    logger.error(
      "[server][tickets-service][getChatMessagesForTicketServices] | failed",
      {
        ticketId,
        error: e?.message,
        stack: e?.stack,
      },
    );

    return {
      ok: false,
      message: t("ticket.chats_load_failed") || t("ticket.media_upload_failed"),
      errors: [
        {
          key: "ticket.chats_load_failed",
          message:
            t("ticket.chats_load_failed") || t("ticket.media_upload_failed"),
        },
      ],
      data: [],
    };
  }
};
