export const parseArray = (value: unknown): string[] => {
  if (value == null) return [];

  // Already an array → ensure everything is string
  if (Array.isArray(value)) {
    return value.map(String);
  }

  if (typeof value === "string") {
    // Attempt to parse JSON like '["a","b"]'
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map(String);
      }
    } catch {
      // Ignore parse errors — fallback below
    }

    // Fallback: treat value as CSV
    return value
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
  }

  return [];
};

export const parseIfJson = <T>(value: unknown): T | undefined => {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return undefined;
    }
  }
  return value as T;
};
