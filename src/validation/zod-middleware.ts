import { ZodObject, ZodSchema } from "zod";
import { Request, Response, NextFunction } from "express";

/**
 * A middleware that validates the request body, query, and params
 * using a given Zod schema. If the validation fails, it returns a
 * 400 response with the errors localized using req.t (if available).
 * If the validation succeeds, it calls the next middleware in the chain.
 * @param schema - A Zod schema that takes a req.t function as a parameter.
 * @returns A middleware that validates the request body, query, and params.
 * @example
 * const createUserSchema = (t: Request["t"]) => z.object({
 *   name: z.string().min(1).max(100),
 *   email: z.string().email(),
 *   password: z.string().min(6, { message: t("password_too_short") }).max(200),
 * });
 * app.use(validate(createUserSchema));
 */
export const validate =
  (schema: (t: Request["t"]) => ZodSchema<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate the request body, query, and params using the schema
      schema(req.t).parse({
        ...req.body,
        ...req.params,
        ...req.query,
      });
      next(); // If validation succeeds, move to the next middleware
    } catch (err: any) {
      // Map Zod errors into friendly messages and localize using req.t
      const issues = (err?.issues || [])
        .map((issue: any) => {
          const msgKey = issue.message || "invalid_input";
          const message = req.t ? req.t(msgKey) || msgKey : msgKey;

          // Return the field name (key) and the localized message
          return {
            key: issue.path?.[0] || "unknown", // path[0] is the field name (key)
            message, // Localized or fallback message
          };
        })
        // Remove duplicates based on the 'key' and 'message'
        .filter(
          (value, index, self) =>
            index ===
            self.findIndex(
              (t) => t.key === value.key && t.message === value.message
            )
        );

      // Return the validation errors in the response
      return res.status(400).json({ errors: issues });
    }
  };
