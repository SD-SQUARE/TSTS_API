import { z } from "zod";
import { Request } from "express";

export const createTicketReviewSchema = (t: Request["t"]) =>
  z.object({
    rating: z
      .number()
      .min(1, { message: t("rating_min") })
      .max(5, { message: t("rating_max") }),

    note: z
      .string()
      .max(2000, { message: t("note_too_long") })
      .optional(),
  });