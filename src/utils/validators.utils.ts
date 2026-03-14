import { t } from "i18next";
import { Lang } from "../types/lang.types.js";

export class ValidatorsUtils {
  static validateUUID(
    ids?: string[] | null,
    entityName?: string,
    language: Lang = "en",
  ): any {
    const errors: string[] = [];

    if (ids && Array.isArray(ids) && ids.length > 0) {
      // UUID regex pattern
      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      const invalidIds = ids.filter((id) => !uuidPattern.test(id));

      if (invalidIds.length > 0) {
        errors.push(
          t("common.invalid_uuid", {
            lng: language,
            entityName: entityName ?? t("common.ids", { lng: language }),
            invalidIds: invalidIds.join(", "),
          }),
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static validateDateRange(
    startDate?: Date | string,
    endDate?: Date | string,
    language: Lang = "en",
  ) {
    const errors: string[] = [];

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime())) {
        errors.push(t("common.invalid_date_format_start", { lng: language }));
      }

      if (isNaN(end.getTime())) {
        errors.push(t("common.invalid_date_format_end", { lng: language }));
      }

      if (start > end) {
        errors.push(t("common.date_range_error", { lng: language }));
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
