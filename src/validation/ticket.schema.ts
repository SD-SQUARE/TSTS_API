// src/validations/tickets.schema.ts
import { z } from "zod";
import { Request } from "express";
import { TicketStatus } from "../enums/TicketStatus.enum.js";
import { TicketActivityType } from "../enums/TicketActivity.enum.js";

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

    isDraft: z
      .preprocess((value) => value === true || value === "true" || value === "1", z.boolean())
      .optional(),
  });

export const getTicketsSchema = (t: Request["t"]) =>
  z.object({
    id: z.string().uuid(t("invalid_ticket_id")).optional(),

    ticket_number: z.coerce.number().int().positive().optional(),

    title: z.string().optional(),

    specialization: z
      .union([
        z.string().uuid(t("invalid_specialization_id")),
        z.array(z.string().uuid(t("invalid_specialization_id"))),
      ])
      .optional(),

    problem: z
      .union([
        z.string().uuid(t("invalid_problem")),
        z.array(z.string().uuid(t("invalid_problem"))),
      ])
      .optional(),

    status: z
      .union([z.string(), z.array(z.string())])
      .optional(),

    priority: z
      .union([z.string(), z.array(z.string())])
      .optional(),

    requester: z
      .union([
        z.string().uuid(t("invalid_requester")),
        z.array(z.string().uuid(t("invalid_requester"))),
      ])
      .optional(),

    assignee: z
      .union([
        z.string().uuid(t("invalid_user_id")),
        z.array(z.string().uuid(t("invalid_user_id"))),
      ])
      .optional(),

    university: z
      .union([
        z.string().uuid(t("invalid_university_id")),
        z.array(z.string().uuid(t("invalid_university_id"))),
      ])
      .optional(),

    domain: z
      .union([
        z.string().uuid(t("invalid_domain_id")),
        z.array(z.string().uuid(t("invalid_domain_id"))),
      ])
      .optional(),

    department: z
      .union([
        z.string().uuid(t("invalid_department_id")),
        z.array(z.string().uuid(t("invalid_department_id"))),
      ])
      .optional(),

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

export const getTicketActivitiesSchema = (t: Request["t"]) =>
  z
    .object({
      userId: z
        .string()
        .uuid({ message: t("invalid_user_id") })
        .optional(),

      type: z.string().optional(),

      from: z.coerce.date().optional(),

      to: z.coerce.date().optional(),
    })
    .refine(
      (data) => {
        if (data.from && data.to) {
          return data.from <= data.to;
        }
        return true;
      },
      {
        message: t("invalid_date_range"),
        path: ["from"],
      },
    );
