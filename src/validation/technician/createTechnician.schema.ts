import { z } from "zod";
import { Request } from "express";
import {
  ARABIC_REGEX,
  EGYPTIAN_SSN_REGEX,
  ENGLISH_REGEX,
  PASSWORD_NUMBER_REGEX,
  PASSWORD_SPECIAL_CHAR_REGEX,
  PASSWORD_UPPERCASE_REGEX,
} from "../../config/validations.js";
import { zStringArray } from "../../utils/zodHelper.js";
import { UserType } from "../../enums/UserType.enum.js";

export const createTechnicianSchema = (t: Request["t"]) =>
  z.object({
    image: z
      .any()
      .optional()
      .refine(
        (file) => {
          if (!file) return true;
          return (
            typeof file.originalname === "string" &&
            /\.(jpg|jpeg|png|gif|webp)$/i.test(file.originalname)
          );
        },
        { message: t("invalid_image_extension") }
      )
      .refine(
        (file) => {
          if (!file) return true; // ⬅️ skip validation if no file
          return file.size <= 1 * 1024 * 1024; // 1 MB
        },
        { message: t("image_must_be_under_1mb") }
      ),

    email: z.string().email({ message: t("invalid_mail") }),

    password: z
      .string()
      .min(8, { message: t("password_too_short") })
      .max(200)
      .regex(PASSWORD_UPPERCASE_REGEX, {
        message: t("password_must_contain_uppercase"),
      })
      .regex(PASSWORD_NUMBER_REGEX, {
        message: t("password_must_contain_number"),
      })
      .regex(PASSWORD_SPECIAL_CHAR_REGEX, {
        message: t("password_must_contain_special_char"),
      }),

    user_type: z.nativeEnum(UserType),

    // English names
    first_name_en: z
      .string()
      .nonempty({ message: t("first_name_en_required") })
      .max(255)
      .regex(ENGLISH_REGEX, { message: t("first_name_en_must_be_english") }),

    mid_name_en: z
      .string()
      .nonempty({ message: t("mid_name_en_required") })
      .max(255)
      .regex(ENGLISH_REGEX, { message: t("mid_name_en_must_be_english") }),

    last_name_en: z
      .string()
      .nonempty({ message: t("last_name_en_required") })
      .max(255)
      .regex(ENGLISH_REGEX, { message: t("last_name_en_must_be_english") }),

    // Arabic names
    first_name_ar: z
      .string()
      .nonempty({ message: t("first_name_ar_required") })
      .max(255)
      .regex(ARABIC_REGEX, { message: t("first_name_ar_must_be_arabic") }),

    mid_name_ar: z
      .string()
      .nonempty({ message: t("mid_name_ar_required") })
      .max(255)
      .regex(ARABIC_REGEX, { message: t("mid_name_ar_must_be_arabic") }),

    last_name_ar: z
      .string()
      .nonempty({ message: t("last_name_ar_required") })
      .max(255)
      .regex(ARABIC_REGEX, { message: t("last_name_ar_must_be_arabic") }),

    ssn: z.string().regex(EGYPTIAN_SSN_REGEX, { message: t("invalid_ssn") }),

    university: z.string().uuid({ message: t("university_required") }),
    domain: z.string().uuid({ message: t("domain_required") }),

    // arrays of strings (accepts CSV / JSON / array → always string[])
    departments: z.preprocess((val) => {
      // val comes from form-data -> usually string
      if (typeof val === "string") {
        // Case 1: JSON string like '["uuid1","uuid2"]'
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) return parsed;
        } catch {
          // Case 2: plain comma-separated: "id1,id2,id3"
          return val.split(",").map((s) => s.trim());
        }
      }

      return val; // if already array for any reason
    }, z.array(z.string().uuid({ message: t("department_id_invalid") })).default([])),

    contacts: z.preprocess(
      (value) => {
        // If contacts comes as JSON string from form-data, parse it
        if (typeof value === "string") {
          try {
            return JSON.parse(value);
          } catch {
            return value; // let Zod handle invalid JSON
          }
        }
        return value;
      },
      z
        .object({
          phones: zStringArray().default([]),
          mobiles: zStringArray().default([]),
        })
        .default({
          phones: [],
          mobiles: [],
        })
    ),

    allowed_specializations: z.preprocess((val) => {
      // form-data: could be string, JSON string, or already array
      if (typeof val === "string") {
        // Try JSON first: '["uuid1","uuid2"]'
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) return parsed;
        } catch {
          // Fallback: comma-separated "id1,id2"
          return val
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }
      }

      if (Array.isArray(val)) return val;

      return [];
    }, z.array(z.string().uuid({ message: t("specialization_id_invalid") })).default([])),

    permission_profile: z
      .string()
      .uuid({ message: t("permission_profile_required") }),

    extra_permissions: z.preprocess((val) => {
      if (typeof val === "string") {
        // Case 1: JSON string
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) return parsed;
        } catch {
          // Case 2: multiple form-data rows
          // Postman sends this as an ARRAY in backend automatically
        }
      }

      if (Array.isArray(val)) return val;

      return [];
    }, z.array(z.string().uuid({ message: t("permission_id_invalid") })).default([])),

    revoked_permissions: z.preprocess((val) => {
      if (typeof val === "string") {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) return parsed;
        } catch {}
      }

      if (Array.isArray(val)) return val;

      return [];
    }, z.array(z.string().uuid({ message: t("permission_id_invalid") })).default([])),

    job_en: z
      .string()
      .nonempty({ message: t("job_en_required") })
      .max(255)
      .regex(ENGLISH_REGEX, { message: t("job_en_must_be_english") }),

    job_ar: z
      .string()
      .nonempty({ message: t("job_ar_required") })
      .max(255)
      .regex(ARABIC_REGEX, { message: t("job_ar_must_be_arabic") }),
  });
