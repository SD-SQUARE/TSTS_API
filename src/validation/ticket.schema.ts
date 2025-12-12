// src/validations/tickets.schema.ts
import { z } from "zod";
import { Request } from "express";

export const createTicketSchema = (t: Request["t"]) =>
  z.object({
    title: z
      .string()
      .min(1, { message: t("title_required") })
      .max(100, { message: t("title_too_long") }),

    description: z
      .string()
      .min(1, { message: t("description_required") })
      .max(2000, { message: t("description_too_long") }),

    requester: z.string().uuid({ message: t("invalid_requester") }),

    specialization: z
      .string()
      .uuid({ message: t("invalid_specialization") })
      .nullable()
      .optional(),
  });
