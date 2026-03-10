import { z } from "zod";
import { Request } from "express";

export const getAvailableReportsSchema = (t: Request["t"]) =>
  z.object({
    search: z.string().trim().optional(),
  });

export const getDashboardStatsSchema = (t: Request["t"]) =>
  z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    periodType: z.preprocess(
      (val) => (typeof val === "string" ? val.trim() : val),
      z.string().optional(),
    ),
  });

export const generateReportByIdSchema = (t: Request["t"]) =>
  z.object({
    reportId: z
      .string()
      .uuid({ message: t("report_common.invalid_report_id") }),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    filters: z
      .string()
      .optional()
      .refine(
        (val) => {
          // If no value or empty string, it's valid
          if (!val || val.trim() === "") {
            return true;
          }

          try {
            const parsed = JSON.parse(val);

            // Validate it's an array
            if (!Array.isArray(parsed)) {
              return false;
            }

            // Validate each filter object has column and value
            for (let i = 0; i < parsed.length; i++) {
              const filter = parsed[i];
              if (!filter || typeof filter !== "object") {
                return false;
              }
              if (!filter.column || typeof filter.column !== "string") {
                return false;
              }
              if (
                filter.value === undefined ||
                filter.value === null ||
                filter.value === ""
              ) {
                return false;
              }
            }

            return true;
          } catch (e) {
            return false;
          }
        },
        {
          message: t("report_common.invalid_filters_format"),
        },
      ),
    download: z.string().optional(),
    type: z.string().optional(),
    periodType: z.preprocess(
      (val) => (typeof val === "string" ? val.trim() : val),
      z.string().optional(),
    ),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  });

export type GenerateReportByIdQuery = z.infer<
  ReturnType<typeof generateReportByIdSchema>
>;
