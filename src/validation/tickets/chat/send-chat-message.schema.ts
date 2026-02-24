import { z } from "zod";
import { Request } from "express";

export const createMessageSchema = (t: Request["t"]) =>
  z.object({
    senderId: z.string().uuid({ message: t("ticket.sender_id_invalid") }),

    // string OR null, and if string => <= 2000
    message: z
      .string()
      // .max(2000, { message: t("ticket.message_too_long") })
      .nullable()
      .optional(),

    // mediaIds can be: array of UUIDs OR null OR missing
    mediaIds: z
      .array(z.string().uuid({ message: t("ticket.media_id_invalid") }))
      .nullable()
      .optional(),
  });
