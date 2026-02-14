import{z} from"zod";
import { Request} from "express";
import {ENGLISH_REGEX,ARABIC_REGEX}from "../config/validations.js"
export const ProblemSchema=(t:Request["t"])=>
    z.object({
            name_en: z.string().regex(ENGLISH_REGEX),
            name_ar: z.string().regex(ARABIC_REGEX),
            description_en: z.string().regex(ENGLISH_REGEX).optional(),
            description_ar: z.string().regex(ARABIC_REGEX).optional(),
            review_required: z.boolean().default(false),
            });

export const UpdateProblemSchema = (t: Request["t"]) =>
  ProblemSchema(t).partial();