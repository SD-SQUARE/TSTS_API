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

    heads: z
      .array(z.string().uuid({ message: t("invalid_head_id") }))
      .min(1, { message: t("invalid_heads") }),

    specializations: z
      .array(z.string().uuid({ message: t("invalid_specialization_id") }))
      .min(1, { message: t("invalid_specializations") }),
  });

export const editGroupSchema = (t: Request["t"]) =>
  z.object({
    name_en: z
      .string()
      .min(1)
      .max(100)
      .regex(ENGLISH_REGEX, { message: t("name_en_must_be_english") })
      .optional(),

    name_ar: z
      .string()
      .min(1)
      .max(100)
      .regex(ARABIC_REGEX, { message: t("name_ar_must_be_arabic") })
      .optional(),

    description_en: z.string().min(1).max(500).optional(),
    description_ar: z.string().min(1).max(500).optional(),
    color: z.string().min(1).max(50).optional(),
    heads: z.array(z.string().uuid({ message: t("invalid_head_id") })).optional(),
    specializations: z
      .array(z.string().uuid({ message: t("invalid_specialization_id") }))
      .optional(),
  });

const teamPayloadSchema = (t: Request["t"]) =>
  z.object({
    id: z.string().uuid({ message: t("invalid_team_id") }).optional(),
    name_en: z
      .string()
      .min(1, { message: t("team_name_en_required") })
      .max(100)
      .regex(ENGLISH_REGEX, { message: t("name_en_must_be_english") }),
    name_ar: z
      .string()
      .min(1, { message: t("team_name_ar_required") })
      .max(100)
      .regex(ARABIC_REGEX, { message: t("name_ar_must_be_arabic") }),
    lead_ids: z
      .array(z.string().uuid({ message: t("invalid_team_lead_id") }))
      .default([]),
    member_ids: z
      .array(z.string().uuid({ message: t("invalid_team_member_id") }))
      .default([]),
  });

export const upsertGroupAssignmentsSchema = (t: Request["t"]) =>
  z.object({
    users: z
      .array(z.string().uuid({ message: t("invalid_user_id") }))
      .default([]),
    teams: z.array(teamPayloadSchema(t)).default([]),
  });
