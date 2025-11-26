// src/validations/groups.schema.ts
import { z } from "zod";
import { Request } from "express";
import { ARABIC_REGEX, ENGLISH_REGEX } from "../config/validations.js";

export const createGroupSchema = (t: Request["t"]) =>
  z.object({
    name_en: z
      .string()
      .min(1)
      .max(100)
      .regex(ENGLISH_REGEX, { message: t("name_en_must_be_english") }),

    name_ar: z
      .string()
      .min(1)
      .max(100)
      .regex(ARABIC_REGEX, { message: t("name_ar_must_be_arabic") }),

    description_en: z.string().min(1).max(500),
    description_ar: z.string().min(1).max(500),

    color: z.string().min(1).max(50),

    team_leader: z.string().uuid({ message: t("invalid_team_leader") }),

    heads: z
      .array(z.string().uuid({ message: t("invalid_head_id") }))
      .min(1, { message: t("invalid_heads") }),

    specializations: z
      .array(z.string().uuid({ message: t("invalid_specialization_id") }))
      .min(1, { message: t("invalid_specializations") }),
  });
