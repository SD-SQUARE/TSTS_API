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

export const getTicketsSchema = (t: Request["t"]) =>
  z.object({
    title: z.string().optional(),

    specialization: z.string().uuid(t("invalid_specialization_id")).optional(),

    status: z.string().optional(),

    priority: z.string().optional(),

    page_index: z.coerce.number().int().min(1).optional(),

    page_size: z.coerce.number().int().min(1).max(100).optional(),
  });

export type GetTicketsQuery = z.infer<ReturnType<typeof getTicketsSchema>>;
