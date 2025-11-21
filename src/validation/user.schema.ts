import { z } from "zod";
import { Request } from "express";
import { ARABIC_REGEX, ENGLISH_REGEX } from "../config/validations.js";

// FIXME: change schema
export const createUserSchema = (t: Request['t']) => z.object({
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
  email: z.string().email({ message: t("invalid_mail") }),
  password: z.string().min(6, { message: t("password_too_short") }).max(200),
});
