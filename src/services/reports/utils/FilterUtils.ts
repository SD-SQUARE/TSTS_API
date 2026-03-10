export class FilterUtils {
  static groupFiltersByColumn(
    filters: Array<{ column: string; value: string | string[] }>,
  ): Record<string, string[]> {
    const grouped: Record<string, string[]> = {};

    for (const filter of filters) {
      if (!filter.column || !filter.value) continue;

      // Initialize array if column doesn't exist
      if (!grouped[filter.column]) {
        grouped[filter.column] = [];
      }

      // Add value(s) to the column array
      if (Array.isArray(filter.value)) {
        grouped[filter.column].push(...filter.value);
      } else {
        grouped[filter.column].push(filter.value);
      }
    }

    // Remove duplicates from each column
    for (const column in grouped) {
      grouped[column] = [...new Set(grouped[column])];
    }
    return grouped;
  }
}
