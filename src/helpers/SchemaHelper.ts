import { z } from "zod";

export const coerceBooleanFromFormData = (t: (k: string) => string) =>
  z.preprocess((val) => {
    if (val === undefined || val === null || val === "") return undefined;

    if (typeof val === "boolean") return val;

    if (typeof val === "string") {
      const v = val.trim().toLowerCase();
      if (["true", "1", "yes", "y", "on"].includes(v)) return true;
      if (["false", "0", "no", "n", "off"].includes(v)) return false;
    }

    return val; // will fail validation below
  }, z.boolean({ message: t("invalid_boolean") }));

export const coerceStringArrayFromFormData = () =>
  z.preprocess((val) => {
    if (val === undefined || val === null || val === "") return undefined;

    // Already an array (some parsers provide arrays for repeated keys)
    if (Array.isArray(val)) return val;

    if (typeof val === "string") {
      const s = val.trim();

      // Case 1: JSON array string: '["id1","id2"]'
      if (s.startsWith("[") && s.endsWith("]")) {
        try {
          const parsed = JSON.parse(s);
          return parsed;
        } catch {
          // fall through to CSV parsing
        }
      }

      // Case 2: CSV: "id1,id2"
      if (s.includes(",")) {
        return s
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);
      }

      // Case 3: single id: "id1"
      return [s];
    }

    return val; // will fail validation below
  }, z.array(z.string()));
