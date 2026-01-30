import { z } from "zod";
import { Request } from "express";

export const getNotificationsSchema = (t: Request["t"]) =>
  z.object({
    isRead: z
      .string()
      .optional()
      .refine((val) => val === "true" || val === "false" || val === undefined, {
        message: t("invalid_isRead_filter"),
        path: ["isRead"],
      }),
  });
