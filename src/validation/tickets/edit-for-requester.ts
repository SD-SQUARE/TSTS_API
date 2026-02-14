import { z } from "zod";
import { Request } from "express";

export const editTicketForRequesterSchema = (t: Request["t"]) =>
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
export type EditTicketData = z.infer<
  ReturnType<typeof editTicketForRequesterSchema>
>;
