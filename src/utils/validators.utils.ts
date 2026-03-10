export class ValidatorsUtils {
  static validateUUID(ids?: string[] | null): any {
    const errors: string[] = [];

    if (ids && Array.isArray(ids) && ids.length > 0) {
      // UUID v4 regex pattern
      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      const invalidIds = ids.filter((id) => !uuidPattern.test(id));
      if (invalidIds.length > 0) {
        errors.push(`Invalid UUID format for IDs: ${invalidIds.join(", ")}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static validateDateRange(startDate?: Date | string, endDate?: Date | string) {
    const errors: string[] = [];

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime())) {
        errors.push("Invalid start date format");
      }

      if (isNaN(end.getTime())) {
        errors.push("Invalid end date format");
      }

      if (start > end) {
        errors.push("Start date must be before or equal to end date");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
