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
    page: z
      .string()
      .optional()
      .refine((val) => val === undefined || Number.isInteger(Number(val)), {
        message: t("invalid_input"),
        path: ["page"],
      }),
    pageSize: z
      .string()
      .optional()
      .refine((val) => val === undefined || Number.isInteger(Number(val)), {
        message: t("invalid_input"),
        path: ["pageSize"],
      }),
  });
