import { t } from "i18next";
import { z } from "zod";

export const uploadTicketMediaSchema = z.object({
  files: z
    .array(
      z.object({
        originalname: z.string(), // Check the file name
        mimetype: z.string(), // Check MIME type
        buffer: z.instanceof(Buffer), // Ensure it is a Buffer
        size: z.number(), // Ensure size is a number
      })
    )
    .min(1, { message: t("ticket.at_least_one_filed_required") }), // Ensure there is at least one file
});
