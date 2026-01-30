import { object, z } from "zod";
import { Request } from "express";
import { TicketStatus } from "../../enums/TicketStatus.enum.js";
import { TicketPriority } from "../../enums/TicketPriority.enum.js";
import {
  coerceBooleanFromFormData,
  coerceStringArrayFromFormData,
} from "../../helpers/SchemaHelper.js";

export const editTicketForAdminAndTechniciansSchema = (t: Request["t"]) =>
  z.object({
    title: z
      .string()
      .min(1, { message: t("title_required") })
      .max(100, { message: t("title_too_long") })
      .optional(),

    description: z
      .string()
      .min(1, { message: t("description_required") })
      .max(2000, { message: t("description_too_long") })
      .optional(),

    status: z
      .enum(Object.values(TicketStatus), { message: t("invalid_status") })
      .optional(),

    priority: z
      .enum(Object.values(TicketPriority), {
        message: t("invalid_priority"),
      })
      .optional(),

    isOutOfService: coerceBooleanFromFormData(t).optional(),

    assigneeList: coerceStringArrayFromFormData()
      .pipe(z.array(z.string().uuid({ message: t("invalid_assignee_id") })))
      .optional(),

    specialization: z
      .string()
      .uuid({ message: t("invalid_specialization") })
      .nullable()
      .optional(),
  });
export type EditTicketData = z.infer<
  ReturnType<typeof editTicketForAdminAndTechniciansSchema>
>;
