// src/validations/tickets.schema.ts
import { z } from "zod";
import { Request } from "express";
import { TicketStatus } from "../enums/TicketStatus.enum.js";

export const createTicketSchema = (t: Request["t"]) =>
  z.object({
    title: z
      .string()
      .min(1, { message: t("title_required") })
      .max(100, { message: t("title_too_long") }),

    description: z
      .string()
      .min(1, { message: t("description_required") }),
      // .max(2000, { message: t("description_too_long") }),

    requester: z.string().uuid({ message: t("invalid_requester") }),

    specialization: z
      .string()
      .uuid({ message: t("invalid_specialization") })
      .nullable()
      .optional(),

    problem: z
      .string()
      .uuid({ message: t("invalid_problem") })
      .nullable()
      .optional(),
  });

export const getTicketsSchema = (t: Request["t"]) =>
  z.object({
    id: z.string().uuid(t("invalid_ticket_id")).optional(),

    title: z.string().optional(),

    specialization: z.string().uuid(t("invalid_specialization_id")).optional(),

    problem: z.string().uuid(t("invalid_problem")).optional(),

    status: z.string().optional(),

    priority: z.string().optional(),

    page_index: z.coerce.number().int().min(1).optional(),

    page_size: z.coerce.number().int().min(1).max(100).optional(),
  });

export type GetTicketsQuery = z.infer<ReturnType<typeof getTicketsSchema>>;

export const changeTicketStatusSchema = (t: Request["t"]) =>
  z.object({
    status: z
      .enum([
        TicketStatus.OPEN,
        TicketStatus.IN_PROGRESS,
        TicketStatus.PENDING,
        TicketStatus.CLOSED,
        TicketStatus.RESOLVED,
        TicketStatus.REOPEN,
        TicketStatus.OUT_OF_SERVICE,
      ])
      .refine((val) => Object.values(TicketStatus).includes(val), {
        message: t("status_invalid"),
      }),
  });
