import { z } from "zod";

export const parseArray = (value: unknown): string[] => {
  if (value == null) return [];

  if (Array.isArray(value)) {
    return value.map(String);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      // ignore parse errors
    }

    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  return [];
};

export const zStringArray = () => z.preprocess(parseArray, z.array(z.string()));
