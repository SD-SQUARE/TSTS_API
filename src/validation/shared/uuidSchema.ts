import z from "zod";

// tocheck if it is valid uuid
export const uuidValidationSchema = z
  .string()
  .uuid({ message: "Invalid UUID format" });
