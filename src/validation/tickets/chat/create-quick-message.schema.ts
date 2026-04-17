import { z } from "zod";
import { Request } from "express";

export const createQuickMessageSchema = (_t: Request["t"]) =>
  z.object({
    title_en: z.string().trim().max(120).optional(),
    title_ar: z.string().trim().max(120).optional(),
    content_en: z.string().trim().min(1).max(5000),
    content_ar: z.string().trim().min(1).max(5000),
  });
