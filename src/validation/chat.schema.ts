import { z } from "zod";
import { Request } from "express";

export const sendPersonalMessageSchema = (t: Request["t"]) =>
  z.object({
    content: z.string().optional(),
  }).refine(
    (data) => data.content && data.content.trim().length > 0,
    {
      message: t("message_content_required"),
      path: ["content"],
    }
  );
